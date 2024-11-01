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
import { Credentials } from "../model/credentials.dao.js";
import { Repository } from "typeorm";
import { DidService } from "../did/did.service.js";
import axios from "axios";
import { SignatureService } from "../keys/signature.service.js";
import { DIDDocument, ServiceEndpoint } from "did-resolver";

@Injectable()
export class CredentialsService {
  constructor(
    readonly config: RootConfig,
    @InjectRepository(Credentials)
    private readonly credentialRepository: Repository<Credentials>,
    private readonly didService: DidService,
    private readonly signatureService: SignatureService
  ) {
    this.initialized = this.init();
  }
  readonly logger = new Logger(this.constructor.name);
  initialized: Promise<boolean>;

  async init() {
    this.logger.log("Initializing CredentialService");
    await Promise.all(
      this.config.initCredentials.map((c) => this.insertIfNotExists(c))
    );
    return true;
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

  async getCredentials(targetDid?: string): Promise<Credentials[]> {
    return this.credentialRepository.find({
      where: {
        targetDid: targetDid
      }
    });
  }

  async getCredential(
    credentialId: string,
    targetDid?: string
  ): Promise<Credentials> {
    const credential = await this.credentialRepository.findOneBy({
      id: credentialId,
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
  ): Promise<Credentials> {
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

  async getDataspaceCredentials(): Promise<Credentials[]> {
    try {
      const issuerUrls = this.config.oid4vci.holder.map(
        (holder) => holder.issuerUrl
      );
      if (issuerUrls) {
        const didDocuments = await Promise.all(
          issuerUrls.map(async (issuerUrl) => {
            const response = await axios.get<DIDDocument>(
              `${issuerUrl}/.well-known/did.json`
            );
            return response.data;
          })
        );
        const serviceEndpoints: ServiceEndpoint[] = didDocuments
          .map((didDocument) =>
            didDocument?.service
              ?.filter((service) => service.type === "Management")
              .map((service) => service.serviceEndpoint)
          )
          .filter((result) => result !== undefined)
          .flat();

        const credentials = await Promise.all(
          serviceEndpoints.flatMap(async (serviceEndpoint) => {
            const response = await axios.get<Credentials[]>(
              `${serviceEndpoint}/credentials`
            );
            return response.data;
          })
        );
        return credentials.flat();
      } else {
        this.logger.warn(
          "No issuer URLs configured. Registry will not work for this instance."
        );
        return [];
      }
    } catch (err) {
      throw new AppError(
        `Could not fetch credentials at dataspace wallet`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
  }

  async importCredential(
    credential: VerifiableCredential,
    targetDid?: string
  ): Promise<Credentials> {
    const didId = targetDid || (await this.didService.getDidId());
    if (!credential.id?.startsWith(`${didId}#`)) {
      throw new AppError(
        "Imported credentials must be have an ID that starts with a DID appended with # and a credential ID",
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
  ): Promise<Credentials> {
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
    const credential = await this.credentialRepository.findOneBy({
      id: credentialId,
      targetDid: targetDid
    });
    if (credential === null) {
      throw new AppError(
        `Credential with identifier ${credentialId} can't be found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "debug");
    }
    await this.credentialRepository.remove(credential);
  }

  async selfIssueCredential(
    credentialConfig: InitCredentialConfig,
    targetDid?: string
  ): Promise<Credentials> {
    this.logger.log(
      `Creating verifiable credential for ${credentialConfig.id}`
    );
    const issuanceDate = new Date();
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 3);
    const target = targetDid ? targetDid : await this.didService.getDidId();
    const credentialId = credentialConfig.id.startsWith(target)
      ? credentialConfig.id
      : `${target}#${credentialConfig.id}`;
    const credential: Credential<CredentialSubject> = {
      "@context": ["https://www.w3.org/2018/credentials/v1"].concat(
        credentialConfig.context
      ),
      type: ["VerifiableCredential"].concat(credentialConfig.type),
      id: credentialId,
      issuer: await this.didService.getDidId(),
      issuanceDate: issuanceDate.toISOString(),
      expirationDate: expirationDate.toISOString(),
      credentialSubject: credentialConfig.credentialSubject
    };

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
      selfIssued: true
    });
  }
}
