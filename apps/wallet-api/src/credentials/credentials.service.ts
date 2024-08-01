import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InitCredentialConfig, RootConfig } from "../config.js";
import {
  Credential,
  CredentialSubject,
  VerifiableCredential,
} from "@tsg-dsp/common-dsp";
import { AppError } from "../utils/error.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Credentials } from "../model/credentials.dao.js";
import { Repository } from "typeorm";
import { DidService } from "../did/did.service.js";
import axios from "axios";
import { SignatureService } from "../keys/signature.service.js";

@Injectable()
export class CredentialsService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(Credentials)
    private readonly credentialRepository: Repository<Credentials>,
    private readonly didService: DidService,
    private readonly signatureService: SignatureService
  ) {
    this.initialized = this.init();
  }
  private readonly logger = new Logger(this.constructor.name);
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
    retry = 0
  ): Promise<void> {
    try {
      const existing = await this.credentialRepository.findOneBy({
        id: initCredentialConfig.id,
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
        await new Promise((f) => setTimeout(f, 10000));
        await this.insertIfNotExists(initCredentialConfig, ++retry);
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
        targetDid: targetDid,
      },
    });
  }

  async getCredential(
    credentialId: string,
    targetDid?: string
  ): Promise<Credentials> {
    const credential = await this.credentialRepository.findOneBy({
      id: credentialId,
      targetDid: targetDid,
    });
    if (credential === null) {
      throw new AppError(
        `Credential with identifier ${credentialId} can't be found`,
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
      id: credentialConfig.id,
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
      const credentials = await Promise.all(
        this.config.oid4vci.holder.flatMap(async (holder) => {
          const response = await axios.get(
            `${holder.issuerUrl}/api/credentials`
          );
          return response.data;
        })
      ).then((credentialArrays) => [].concat(...credentialArrays));
      return credentials;
    } catch (err) {
      throw new AppError(
        `Could not fetch credentials at dataspace wallet`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
  }

  async importCredential(
    credential: VerifiableCredential<CredentialSubject>,
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
      credential: credential,
    });
  }

  async updateCredential(
    credentialId: string,
    credential: InitCredentialConfig | VerifiableCredential<CredentialSubject>,
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
        credential: credential,
      });
    }
  }

  async deleteCredential(credentialId: string, targetDid?: string) {
    const credential = await this.credentialRepository.findOneBy({
      id: credentialId,
      targetDid: targetDid,
    });
    if (credential === null) {
      throw new AppError(
        `Credential with identifier ${credentialId} can't be found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "debug");
    }
    await this.credentialRepository.softRemove(credential);
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
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3c.github.io/vc-jws-2020/contexts/v1/",
      ].concat(credentialConfig.context),
      type: ["VerifiableCredential"].concat(credentialConfig.type),
      id: credentialId,
      issuer: await this.didService.getDidId(),
      issuanceDate: issuanceDate.toISOString(),
      expirationDate: expirationDate.toISOString(),
      credentialSubject: credentialConfig.credentialSubject,
    };

    const proof = await this.signatureService.signAsJsonWebSignature(
      credential,
      credentialConfig.keyId
    );

    const verifiableCredential: VerifiableCredential<CredentialSubject> = {
      ...credential,
      proof: proof,
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
    });
  }
}
