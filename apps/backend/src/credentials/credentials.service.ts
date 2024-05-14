import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InitCredentialConfig, RootConfig } from "../config.js";
import { CompactSign, importJWK } from "jose";
import {
  Credential,
  CredentialSubject,
  Signature,
  VerifiableCredential,
  VerifiablePresentation,
} from "@tsg-dsp/common";
import jsonld from "jsonld";
import crypto from "crypto";
import { AppError, parseNetworkError } from "../utils/error.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Credentials, KeyMaterials } from "../model/credentials.dao.js";
import { Repository } from "typeorm";
import { DidService } from "../did/did.service.js";
import { KeysService } from "../keys/keys.service.js";
import { ComplianceRequest, LegalRegistrationNumberRequest } from "@libs/dtos";
import axios from "axios";
import { toArray } from "../utils/unions.js";
import { signingAlgorithm } from "../utils/keymapping.js";

@Injectable()
export class CredentialsService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(Credentials)
    private readonly credentialRepository: Repository<Credentials>,
    private readonly didService: DidService,
    private readonly keyService: KeysService
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
    const normalized = await jsonld.normalize(credential, {
      algorithm: "URDNA2015",
    });
    let keyMaterial: KeyMaterials | null;
    if (credentialConfig.keyId) {
      keyMaterial = await this.keyService.getKey(credentialConfig.keyId);
    } else {
      keyMaterial = await this.keyService.getDefaultKey();
    }
    this.logger.debug(`Signing with key ${keyMaterial.id}`);
    const hash = crypto.createHash("sha256").update(normalized).digest("hex");
    const signature = new CompactSign(
      new TextEncoder().encode(hash)
    ).setProtectedHeader({
      alg: signingAlgorithm(keyMaterial.type),
      b64: false,
      crit: ["b64"],
    });
    const privateKey = await importJWK(keyMaterial.privateKey);
    const jws = await signature.sign(privateKey);

    const proof: Signature = {
      type: "JsonWebSignature2020",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      jws: jws,
      verificationMethod: `${await this.didService.getDidId()}#${
        keyMaterial.id
      }`,
    };

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
