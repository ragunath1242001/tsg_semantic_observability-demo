import { Bitstring } from "@digitalbazaar/bitstring";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import { PaginationOptionsDto } from "@tsg-dsp/common-api";
import {
  Credential,
  CredentialSubject,
  EnvelopedVerifiableCredential,
  formatCredential,
  VerifiableCredential
} from "@tsg-dsp/common-dsp";
import { resolveDid } from "@tsg-dsp/common-signing-and-validation";
import axios from "axios";
import { randomInt } from "crypto";
import { ServiceEndpoint } from "did-resolver";
import { DeepPartial, Equal, Or, Repository } from "typeorm";

import { InitCredentialConfig, RootConfig } from "../config.js";
import { DidService } from "../did/did.service.js";
import { KeysService } from "../keys/keys.service.js";
import { SignatureService } from "../keys/signature.service.js";
import {
  CredentialDao,
  StatusListCredentialDao
} from "../model/credentials.dao.js";
import { API_PREFIX } from "../utils/api-prefix.js";
import { retry } from "../utils/retry.js";

@Injectable()
export class CredentialsService {
  constructor(
    readonly config: RootConfig,
    @InjectRepository(CredentialDao)
    private readonly credentialRepository: Repository<CredentialDao>,
    private readonly didService: DidService,
    private readonly keysService: KeysService,
    private readonly signatureService: SignatureService,
    @InjectRepository(StatusListCredentialDao)
    private readonly statusListCredentialRepository: Repository<StatusListCredentialDao>
  ) {
    this.initialized = this.init();
  }
  readonly logger = new Logger(this.constructor.name);
  initialized: Promise<boolean>;

  async init() {
    this.logger.log("Initializing CredentialService");
    for (const credential of this.config.initCredentials) {
      // eslint-disable-next-line no-await-in-loop
      await retry(async () => {
        const existing = await this.credentialRepository.findOneBy({
          id: credential.id
        });
        if (!existing) {
          this.logger.log(`Creating initial credential ${credential.id}`);
          await this.selfIssueCredential(
            credential,
            credential.credentialSubject.id
          );
        } else {
          this.logger.log(`Using existing initial credential ${credential.id}`);
        }
      }, `insert initial credential ${credential.id}`);
    }
    if (this.config.issuance.issuer.length > 0) {
      await this.keysService.initialized;
      await this.assignStatusListIndex();
    }
    return true;
  }

  private credentialAddress(): string {
    return `${this.config.server.publicAddress}${API_PREFIX}/credentials`;
  }

  async getPaginatedCredentials(
    paginationOptions: PaginationOptionsDto,
    targetDid?: string
  ) {
    const [credentials, itemCount] =
      await this.credentialRepository.findAndCount({
        where: {
          targetDid: targetDid
        },
        ...paginationOptions.typeOrm
      });
    return {
      data: credentials,
      total: itemCount
    };
  }

  async getPaginatedCredentialsPublic(paginationOptions: PaginationOptionsDto) {
    // eslint-disable-next-line prefer-const
    let [credentials, itemCount] = await this.credentialRepository.findAndCount(
      {
        ...paginationOptions.typeOrm
      }
    );
    // Do not show credentials handed out to mobile devices
    credentials = credentials.filter(
      (credential) => !credential.targetDid.startsWith("did:key:")
    );
    return {
      data: credentials,
      total: itemCount
    };
  }

  async getCredentials(targetDid?: string): Promise<CredentialDao[]> {
    return this.credentialRepository.find({
      where: {
        targetDid: targetDid
      }
    });
  }

  async getCredentialFormatted(
    credentialId: string,
    targetDid?: string
  ): Promise<VerifiableCredential | string> {
    const credential = await this.getCredential(credentialId, targetDid);
    if (credential.jwt) {
      return credential.jwt;
    } else {
      return {
        ...credential.credential,
        proof: credential.proof!
      };
    }
  }

  async getCredential(
    credentialId: string,
    targetDid?: string
  ): Promise<CredentialDao> {
    const credential = await this.credentialRepository.findOneBy({
      id: Or(
        Equal(credentialId),
        Equal(`${this.credentialAddress()}/${credentialId}`)
      ),
      targetDid: targetDid
    });
    if (credential === null) {
      throw new AppError(
        `Credential with identifier ${credentialId} can't be found`,
        HttpStatus.NOT_FOUND,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "debug");
    }
    return credential;
  }

  async issueCredential(
    credentialConfig: InitCredentialConfig,
    targetDid?: string
  ): Promise<CredentialDao> {
    const existing = await this.credentialRepository.findOneBy({
      id: credentialConfig.id
    });
    if (existing) {
      throw new AppError(
        `Credential with identifier ${credentialConfig.id} already exists`,
        HttpStatus.CONFLICT
      ).andLog(this.logger, "debug");
    }
    return await this.selfIssueCredential(credentialConfig, targetDid);
  }

  async getDataspaceCredentials(issuerIds?: string): Promise<CredentialDao[]> {
    try {
      let issuerList: string[];
      if (issuerIds) {
        issuerList = issuerIds.split(",");
      } else {
        const ownCredentials = await this.getCredentials(
          await this.didService.getDidId()
        );
        issuerList = ownCredentials
          .filter((credential) => !credential.selfIssued)
          .map((credential) => credential.credential.issuer);
      }
      const didDocuments = (
        await Promise.allSettled(
          issuerList.map((issuerId) => resolveDid(issuerId))
        )
      )
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

      const serviceEndpoints: ServiceEndpoint[] = didDocuments
        .map((didDocument) =>
          didDocument.service
            ?.filter((service) => service.type === "Management")
            ?.map((service) => service.serviceEndpoint)
        )
        .filter((result) => result !== undefined)
        .flat();

      const credentials = await Promise.allSettled(
        serviceEndpoints.flatMap(async (serviceEndpoint) => {
          const response = await axios.get<CredentialDao[]>(
            `${serviceEndpoint}/credentials`
          );
          return response.data;
        })
      );
      return credentials
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value);
    } catch (_) {
      throw new AppError(
        `Could not fetch credentials at dataspace wallet`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
  }

  async importCredential(
    credential: VerifiableCredential | EnvelopedVerifiableCredential | string,
    targetDid?: string
  ): Promise<CredentialDao> {
    const credentialContainer = formatCredential(credential);
    const didId = targetDid || (await this.didService.getDidId());
    if (
      !credentialContainer.credential.id?.startsWith(`${didId}#`) &&
      !credentialContainer.credential.id?.startsWith("http")
    ) {
      throw new AppError(
        "Imported credentials must be have an ID that starts with a DID appended with # and a credential ID or be a full URL",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }

    return await this.credentialRepository.save({
      id: credentialContainer.credential.id,
      targetDid: didId,
      selfIssued: false,
      credential: credentialContainer.credential,
      jwt: credentialContainer.jwt,
      proof: credentialContainer.proof
    });
  }

  async updateCredential(
    credentialId: string,
    credential:
      | InitCredentialConfig
      | VerifiableCredential
      | EnvelopedVerifiableCredential
      | string,
    targetDid?: string
  ): Promise<CredentialDao> {
    await this.getCredential(credentialId, targetDid);
    if (credential instanceof InitCredentialConfig) {
      return await this.selfIssueCredential(credential, targetDid);
    } else {
      const credentialContainer = formatCredential(credential);
      return await this.credentialRepository.save({
        id: credentialContainer.credential.id,
        targetDid: targetDid || (await this.didService.getDidId()),
        selfIssued: false,
        credential: credentialContainer.credential,
        jwt: credentialContainer.jwt,
        proof: credentialContainer.proof
      });
    }
  }

  async deleteCredential(credentialId: string, targetDid?: string) {
    const credential = await this.getCredential(credentialId, targetDid);
    await this.credentialRepository.remove(credential);
  }

  private normalizeCredentialId(targetDid: string, credentialId: string) {
    if (credentialId.startsWith("http")) {
      return credentialId;
    }
    if (credentialId.startsWith(targetDid)) {
      return credentialId;
    }
    return `${targetDid}#${credentialId}`;
  }

  async selfIssueCredential(
    credentialConfig: InitCredentialConfig,
    targetDid?: string
  ): Promise<CredentialDao> {
    this.logger.log(
      `Creating verifiable credential for ${credentialConfig.id}`
    );
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 3);
    const target = targetDid ? targetDid : await this.didService.getDidId();
    const credentialId = this.normalizeCredentialId(
      target,
      credentialConfig.id
    );

    const credential: Credential<CredentialSubject> = {
      "@context": ["https://www.w3.org/ns/credentials/v2"].concat(
        credentialConfig.context
      ),
      type: ["VerifiableCredential"].concat(credentialConfig.type),
      id: credentialId,
      issuer: await this.didService.getDidId(),
      validFrom: validFrom.toISOString(),
      validUntil: validUntil.toISOString(),
      credentialSubject: credentialConfig.credentialSubject
    };
    let statusListIndex: number | undefined = undefined;
    let statusListCredential: StatusListCredentialDao | undefined = undefined;
    if (credentialConfig.revocable) {
      const statusList = await this.assignStatusListIndex();
      credential.credentialStatus = {
        id: `${statusList.statusListCredential.id}#${statusList.statusListIndex}`,
        type: "BitstringStatusListEntry",
        statusPurpose: "revocation",
        statusListIndex: statusList.statusListIndex.toString(),
        statusListCredential: statusList.statusListCredential.id
      };
      statusListIndex = statusList.statusListIndex;
      statusListCredential = statusList.statusListCredential;
    }

    const credentialPart: DeepPartial<CredentialDao> = {
      id: credentialId,
      targetDid: credentialId.split("#")?.[0],
      credential: credential,
      selfIssued: true,
      statusListIndex,
      statusListCredential
    };

    if (credentialConfig.proofType === "jwt") {
      const jwt = await this.signatureService.signContainerAsJwt(credential, {
        keyId: credentialConfig.keyId,
        iat: true,
        expiresIn: validUntil,
        iss: true,
        typ: "vc+jwt",
        cty: "vc"
      });
      credentialPart.jwt = jwt;
      this.logger.debug(
        `Verifiable credential ${credentialConfig.id}\n${JSON.stringify(
          credential,
          null,
          2
        )}\n${jwt}`
      );
    } else {
      credential["@context"].splice(
        1,
        0,
        "https://w3id.org/security/data-integrity/v2"
      );
      const proof = await this.signatureService.signAsDataIntegrityProof(
        "RDFC",
        credential,
        credentialConfig.keyId
      );
      credentialPart.proof = proof;
      this.logger.debug(
        `Verifiable credential ${credentialConfig.id}\n${JSON.stringify(
          credential,
          null,
          2
        )}\n${JSON.stringify(proof, null, 2)}`
      );
    }
    return await this.credentialRepository.save(credentialPart);
  }

  private async createEncodedBitstring(revoked: number[]): Promise<string> {
    const bitstring = new Bitstring({ length: 16384 });
    for (const position of revoked) {
      bitstring.set(position, true);
    }
    return `u${await bitstring.encodeBits()}`;
  }

  private async updateStatusListCredential(
    credentialId: string,
    revoked: number[]
  ) {
    return await this.selfIssueCredential({
      context: [],
      type: ["BitstringStatusListCredential"],
      id: credentialId,
      keyId: undefined,
      proofType: "ldp",
      credentialSubject: {
        id: `${credentialId}#list`,
        type: "BitstringStatusList",
        statusPurpose: "revocation",
        encodedList: await this.createEncodedBitstring(revoked)
      },
      revocable: false
    });
  }

  private async createNewStatusListCredential() {
    const index = await this.statusListCredentialRepository.count();
    const credentialId = `${this.credentialAddress()}/status-${index}`;
    const credential = await this.updateStatusListCredential(credentialId, []);
    return await this.statusListCredentialRepository.save({
      id: credentialId,
      revoked: [],
      full: false,
      credential: credential
    });
  }

  async assignStatusListIndex() {
    let statusListCredential =
      await this.statusListCredentialRepository.findOneBy({
        full: false
      });
    if (!statusListCredential) {
      statusListCredential = await this.createNewStatusListCredential();
    }
    const linkedCredentialsCount = await this.credentialRepository.countBy({
      statusListCredential: {
        id: statusListCredential.id
      }
    });
    if (linkedCredentialsCount >= this.config.issuance.statusListCount) {
      statusListCredential.full = true;
      await this.statusListCredentialRepository.save(statusListCredential);
      statusListCredential = await this.createNewStatusListCredential();
    }
    let available: boolean;
    let newIndex: number;
    do {
      newIndex = randomInt(0, 16384);
      available =
        (await this.credentialRepository.countBy({
          statusListCredential: {
            id: statusListCredential.id
          },
          statusListIndex: newIndex
        })) === 0;
    } while (!available);
    return {
      statusListCredential: statusListCredential,
      statusListIndex: newIndex
    };
  }

  async revokeCredential(credentialId: string, targetDid?: string) {
    const credential = await this.getCredential(credentialId, targetDid);
    if (!credential.statusListCredential || !credential.statusListIndex) {
      throw new AppError(
        `Credential ${credential.id} has no statusListCredential`,
        HttpStatus.BAD_REQUEST
      );
    }
    const statusListCredential = credential.statusListCredential;
    statusListCredential.revoked.push(credential.statusListIndex);

    await this.updateStatusListCredential(
      credential.statusListCredential.id,
      statusListCredential.revoked
    );
    await this.statusListCredentialRepository.save(statusListCredential);
    credential.revoked = true;
    await this.credentialRepository.save(credential);
  }
}
