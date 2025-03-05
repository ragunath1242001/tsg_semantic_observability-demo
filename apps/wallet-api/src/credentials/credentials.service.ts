import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InitCredentialConfig, RootConfig, SignatureType } from "../config.js";
import {
  Credential,
  CredentialSubject,
  Proof,
  VerifiableCredential
} from "@tsg-dsp/common-dsp";
import { AppError } from "../utils/error.js";
import { InjectRepository } from "@nestjs/typeorm";
import {
  CredentialDao,
  StatusListCredentialDao
} from "../model/credentials.dao.js";
import { Equal, Or, Repository } from "typeorm";
import { DidService } from "../did/did.service.js";
import axios from "axios";
import { SignatureService } from "../keys/signature.service.js";
import { ServiceEndpoint } from "did-resolver";
import { DidResolverService } from "../did/did.resolver.service.js";
import { Bitstring } from "@digitalbazaar/bitstring";
import { randomInt } from "crypto";
import { PaginationOptionsDto } from "@tsg-dsp/common-api";

@Injectable()
export class CredentialsService {
  constructor(
    readonly config: RootConfig,
    @InjectRepository(CredentialDao)
    private readonly credentialRepository: Repository<CredentialDao>,
    private readonly didService: DidService,
    private readonly didResolver: DidResolverService,
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
    for (const key of this.config.initCredentials) {
      await this.insertIfNotExists(key);
    }
    return true;
  }

  private credentialAddress(): string {
    return `${this.config.server.publicAddress}${process.env["EMBEDDED_FRONTEND"] ? "/api" : ""}/credentials`;
  }

  private async insertIfNotExists(
    initCredentialConfig: InitCredentialConfig,
    retry = 0,
    backOff = 1000
  ): Promise<void> {
    try {
      const existing = await this.credentialRepository.findOneBy({
        id: initCredentialConfig.id
      });
      if (!existing) {
        this.logger.log(
          `Creating initial credential ${initCredentialConfig.id}`
        );
        await this.selfIssueCredential(
          initCredentialConfig,
          initCredentialConfig.credentialSubject.id
        );
      } else {
        this.logger.log(
          `Using existing initial credential ${initCredentialConfig.id}`
        );
      }
    } catch (err) {
      if (retry < 5) {
        this.logger.warn(
          `Retrying creating credential ${initCredentialConfig.id}`
        );
        this.logger.log(`Error: ${err}`);
        await new Promise((f) => setTimeout(f, backOff));
        await this.insertIfNotExists(
          initCredentialConfig,
          ++retry,
          backOff * 2
        );
      } else {
        this.logger.error(
          `Could not create credential ${initCredentialConfig.id}: ${err}`
        );
        throw err;
      }
    }
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

  async getCredentials(targetDid?: string): Promise<CredentialDao[]> {
    return this.credentialRepository.find({
      where: {
        targetDid: targetDid
      }
    });
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
          issuerList.map((issuerId) => this.didResolver.resolve(issuerId))
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
    credential: VerifiableCredential,
    targetDid?: string
  ): Promise<CredentialDao> {
    const didId = targetDid || (await this.didService.getDidId());
    if (
      !credential.id?.startsWith(`${didId}#`) &&
      !credential.id?.startsWith("http")
    ) {
      throw new AppError(
        "Imported credentials must be have an ID that starts with a DID appended with # and a credential ID or be a full URL",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }
    return await this.credentialRepository.save({
      id: credential.id,
      targetDid: didId,
      selfIssued: false,
      credential: credential
    });
  }

  async updateCredential(
    credentialId: string,
    credential: InitCredentialConfig | VerifiableCredential,
    targetDid?: string
  ): Promise<CredentialDao> {
    await this.getCredential(credentialId, targetDid);
    if (credential instanceof InitCredentialConfig) {
      return await this.selfIssueCredential(credential, targetDid);
    } else {
      return await this.credentialRepository.save({
        id: credentialId,
        targetDid: targetDid || (await this.didService.getDidId()),
        selfIssued: false,
        credential: credential
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
    const issuanceDate = new Date();
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 3);
    const target = targetDid ? targetDid : await this.didService.getDidId();
    const credentialId = this.normalizeCredentialId(
      target,
      credentialConfig.id
    );

    const credential: Credential<CredentialSubject> = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/ns/credentials/status/v1"
      ].concat(credentialConfig.context),
      type: ["VerifiableCredential"].concat(credentialConfig.type),
      id: credentialId,
      issuer: await this.didService.getDidId(),
      issuanceDate: issuanceDate.toISOString(),
      expirationDate: expirationDate.toISOString(),
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

    let proof: Proof;
    if (
      this.config.signature.credentials === SignatureType.DATA_INTEGRITY_PROOF
    ) {
      credential["@context"].splice(
        1,
        0,
        "https://w3id.org/security/data-integrity/v2"
      );
      proof = await this.signatureService.signAsDataIntegrityProof(
        "RDFC",
        credential,
        credentialConfig.keyId
      );
    } else {
      credential["@context"].splice(
        1,
        0,
        "https://w3id.org/security/suites/jws-2020/v1"
      );
      proof = await this.signatureService.signAsJsonWebSignature2020(
        credential,
        credentialConfig.keyId
      );
    }

    const verifiableCredential: VerifiableCredential = {
      ...credential,
      proof: proof
    };
    this.logger.debug(
      `Verifiable credential ${credentialConfig.id}\n${JSON.stringify(
        verifiableCredential,
        null,
        2
      )}`
    );
    return await this.credentialRepository.save({
      id: credentialId,
      targetDid: credentialId.split("#")?.[0],
      credential: verifiableCredential,
      selfIssued: true,
      statusListIndex,
      statusListCredential
    });
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
    if (linkedCredentialsCount >= 1000) {
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
