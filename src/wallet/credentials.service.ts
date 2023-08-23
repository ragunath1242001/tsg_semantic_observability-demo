import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CredentialConfig, RootConfig } from "../config.js";
import { CompactSign, importJWK } from "jose";
import { Credential, CredentialSubject, Signature, VerifiableCredential } from "../model/credential.dto.js";
import jsonld from "jsonld";
import crypto from "crypto";
import { AppError } from "../utils/error.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Credentials, KeyMaterials } from "../model/credentials.dao.js";
import { Repository } from "typeorm";
import { DidService } from "./did.service.js";
import { KeyService } from "./keys.service.js";


export function hashingAlgorithm(type: 'EdDSA' | 'ES384' | 'X509' | 'PS256' | string): string {
  switch(type) {
    case "EdDSA": return 'sha512'
    case "ES384": return 'sha384'
    case "X509": return 'sha256'
    case "PS256": return 'sha256'
    default: return 'sha256'
  }
}
export function signingAlgorithm(type: 'EdDSA' | 'ES384' | 'X509'): string {
  switch(type) {
    case "EdDSA": return 'EdDSA'
    case "ES384": return 'ES384'
    case "X509": return 'PS256'
  }
}

@Injectable()
export class CredentialsService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(Credentials) private readonly credentialRepository: Repository<Credentials>,
    private readonly didService: DidService,
    private readonly keyService: KeyService,
  ) {
    this.init();
  }
  private readonly logger = new Logger(this.constructor.name);
  
  async init() {
    this.logger.log('Initializing CredentialService');
    await Promise.all(this.config.credentials.map(c => this.createCredential(c)));
  }

  async getCredentials(): Promise<Credentials[]> {
    return this.credentialRepository.find({});
  }

  async getCredential(credentialId: string): Promise<Credentials> {
    const credential = await this.credentialRepository.findOneBy({id: credentialId});
    if (credential === null) {
      throw new AppError(`Credential with identifier ${credentialId} can't be found`, HttpStatus.NOT_FOUND)
    }
    return credential;
  }

  async addCredential(credentialConfig: CredentialConfig): Promise<Credentials> {
    const existing = await this.credentialRepository.findOneBy({id: credentialConfig.id});
    if (existing) {
      throw new AppError(`Credential with identifier ${credentialConfig.id} already exists`, HttpStatus.CONFLICT);
    }
    return await this.createCredential(credentialConfig);
  }

  async updateCredential(credentialId: string, credentialConfig: CredentialConfig): Promise<Credentials> {
    const existing = await this.credentialRepository.findOneBy({id:  credentialId});
    if (existing === null) {
      throw new AppError(`Credential with identifier ${credentialConfig.id} can't be found`, HttpStatus.NOT_FOUND);
    }
    const credential = await this.createCredential(credentialConfig);
    return credential;
  }

  async deleteCredential(credentialId: string) {
    const credential = await this.credentialRepository.findOneBy({id: credentialId});
    if (credential === null) {
      throw new AppError(`Credential with identifier ${credentialId} can't be found`, HttpStatus.NOT_FOUND)
    }
    await this.credentialRepository.softRemove(credential);
  }
  
  async createCredential(credentialConfig: CredentialConfig): Promise<Credentials> {
    this.logger.log(`Creating verifiable credential for ${credentialConfig.id}`);
    const issuanceDate = new Date();
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth()+3);
    const credential: Credential<CredentialSubject> = {
      '@context': ["https://www.w3.org/2018/credentials/v1"].concat(credentialConfig.context),
      type: ['VerifiableCredential'].concat(credentialConfig.type),
      id: `${this.config.server.publicAddress}/credentials/${credentialConfig.id}`,
      issuer: await this.didService.getDidId(),
      issuanceDate: issuanceDate.toISOString(),
      expirationDate: expirationDate.toISOString(),
      credentialSubject: credentialConfig.credentialSubject
    }
    const normalized = await jsonld.normalize(credential, {
      algorithm: 'URDNA2015'
    });
    let keyMaterial: KeyMaterials | null;
    if (credentialConfig.keyId) {
      keyMaterial = await this.keyService.getKey(credentialConfig.keyId);
    } else {
      keyMaterial = await this.keyService.getDefaultKey();
    }
    this.logger.debug(`Signing with key ${keyMaterial.id}`);
    const hash = crypto.createHash(hashingAlgorithm(keyMaterial.type)).update(normalized).digest('hex');
    const signature = new CompactSign(new TextEncoder().encode(hash))
      .setProtectedHeader({alg: signingAlgorithm(keyMaterial.type), b64: false, crit: ['b64']});
    const privateKey = await importJWK(keyMaterial.privateKey);
    const jws = await signature.sign(privateKey);
    
    const proof: Signature = {
      type: 'JsonWebSignature2020',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      jws: jws,
      verificationMethod: `${await this.didService.getDidId()}#${keyMaterial.id}`
    }

    const verifiableCredential: VerifiableCredential<CredentialSubject> = {
      ...credential,
      proof: proof
    }
    this.logger.debug(`Verifiable credential ${credentialConfig.id}\n${JSON.stringify(verifiableCredential, null, 2)}`);
    return await this.credentialRepository.save({
      id: credentialConfig.id,
      credential: verifiableCredential
    });
  }
}
