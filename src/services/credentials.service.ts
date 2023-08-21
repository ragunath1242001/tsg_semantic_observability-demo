import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { CredentialConfig, KeyConfig, RootConfig } from "../config";
import { DIDDocument } from "did-resolver";
import fs from "fs";
import { CompactSign, JWK, KeyLike, exportJWK, generateKeyPair, importJWK, importPKCS8, importX509 } from "jose";
import path from "path";
import { Credential, CredentialSubject, Signature, VerifiableCredential } from "../model/credential.dto";
import jsonld from "jsonld";
import crypto from "crypto";
import { AppError } from "../utils/error";

export interface KeyMaterial {
  id: string
  type: 'EdDSA' | 'ES384' | 'X509'
  default: boolean
  privateKey: KeyLike
  publicKey: KeyLike
  jwk: JWK
}

export interface CredentialInstance {
  id: string
  credential: VerifiableCredential<CredentialSubject>
}

@Injectable()
export class CredentialsService {
  constructor(private readonly config: RootConfig) {
    this.init();
  }
  private readonly logger = new Logger(this.constructor.name);
  private readonly didId = `did:web:${this.config.server.publicDomain.replace(':','%3A')}`


  private didDocument?: DIDDocument
  private keyMaterial: KeyMaterial[] = []
  private credentials: CredentialInstance[] = []
  
  async init() {
    this.logger.log('Initializing CredentialService');
    this.keyMaterial = await Promise.all(this.config.keys.map(k => this.createKeyMaterial(k)));
    this.didDocument = await this.createDidDocument(this.keyMaterial);
    this.credentials = await Promise.all(this.config.credentials.map(c => this.createCredential(c)));
  }

  async getDid(): Promise<DIDDocument | undefined> {
    return this.didDocument;
  }

  async getKeys(): Promise<KeyMaterial[]> {
    return this.keyMaterial;
  }

  async getKey(keyId: string): Promise<KeyMaterial> {
    const key = this.keyMaterial.find(key => key.id === keyId);
    if (key === undefined) {
      throw new AppError(`Key with identifier ${keyId} can't be found`, HttpStatus.NOT_FOUND)
    }
    return key;
  }

  async addKey(keyConfig: KeyConfig): Promise<KeyMaterial> {
    const existing = this.keyMaterial.find(key => key.id === keyConfig.id);
    if (existing) {
      throw new AppError(`Key with identifier ${keyConfig.id} already exists`, HttpStatus.CONFLICT);
    }
    const key = await this.createKeyMaterial(keyConfig);
    this.keyMaterial.push(key);
    if (keyConfig.default) {
      this.changeDefaultKey(keyConfig.id);
    }
    this.didDocument = await this.createDidDocument(this.keyMaterial);
    return key;
  }

  async changeDefaultKey(keyId: string) {
    this.keyMaterial.forEach(key => {
      key.default = key.id === keyId
    })
  }

  async deleteKey(keyId: string) {
    const key = this.keyMaterial.find(key => key.id === keyId);
    if (key === undefined) {
      throw new AppError(`Key with identifier ${keyId} can't be found`, HttpStatus.NOT_FOUND)
    }
    this.deleteFile(`${key.id}.privateKey.json`);
    this.deleteFile(`${key.id}.publicKey.json`);
    this.keyMaterial = this.keyMaterial.filter(key => key.id !== keyId);
    this.didDocument = await this.createDidDocument(this.keyMaterial);
  }

  async getCredentials(): Promise<CredentialInstance[]> {
    return this.credentials;
  }

  async getCredential(credentialId: string): Promise<CredentialInstance> {
    const credential = this.credentials.find(credential => credential.id === credentialId);
    if (credential === undefined) {
      throw new AppError(`Credential with identifier ${credentialId} can't be found`, HttpStatus.NOT_FOUND)
    }
    return credential;
  }

  async addCredential(credentialConfig: CredentialConfig): Promise<CredentialInstance> {
    const existing = this.credentials.find(credential => credential.id === credentialConfig.id);
    if (existing) {
      throw new AppError(`Credential with identifier ${credentialConfig.id} already exists`, HttpStatus.CONFLICT);
    }
    const credential = await this.createCredential(credentialConfig);
    this.credentials.push(credential);
    return credential;
  }

  async updateCredential(credentialId: string, credentialConfig: CredentialConfig): Promise<CredentialInstance> {
    const existing = this.credentials.find(credential => credential.id === credentialId);
    if (existing === undefined) {
      throw new AppError(`Credential with identifier ${credentialConfig.id} can't be found`, HttpStatus.NOT_FOUND);
    }
    const credential = await this.createCredential(credentialConfig);
    await this.deleteCredential(existing.id);
    this.credentials.push(credential);
    return credential;
  }

  async deleteCredential(credentialId: string) {
    const credential = this.credentials.find(credential => credential.id === credentialId);
    if (credential === undefined) {
      throw new AppError(`Credential with identifier ${credentialId} can't be found`, HttpStatus.NOT_FOUND)
    }
    this.credentials = this.credentials.filter(credential => credential.id !== credentialId);
  }
  
  async createKeyMaterial(key: KeyConfig): Promise<KeyMaterial> {
    this.logger.log(`Loading key material for key ${key.id}`);
    let privateKey: KeyLike;
    let publicKey: KeyLike;
    if (key.existingKey && key.existingCertificate) {
      this.logger.log(`Loading existing PKCS#8 key and X.509 certificate`);
      privateKey = await importPKCS8(key.existingKey, 'RSA');
      publicKey = await importX509(key.existingCertificate, 'RSA');
    } else if (this.existsFile(`${key.id}.privateKey.json`) && this.existsFile(`${key.id}.publicKey.json`)) {
      this.logger.log(`Loading existing public and private JWK`);
      const privateKeyJson = JSON.parse(this.getFile(`${key.id}.privateKey.json`))
      privateKey = await importJWK(privateKeyJson) as KeyLike;
      const publicKeyJson = JSON.parse(this.getFile(`${key.id}.publicKey.json`));
      publicKey = await importJWK(publicKeyJson) as KeyLike;
    } else {
      this.logger.log(`Creating new keypair with ${key.type}`);
      const keypair = await generateKeyPair(key.type);
      this.writeFile(`${key.id}.privateKey.json`, JSON.stringify(await exportJWK(keypair.privateKey), null, 2));
      this.writeFile(`${key.id}.publicKey.json`, JSON.stringify(await exportJWK(keypair.publicKey), null, 2));
      privateKey = keypair.privateKey;
      publicKey = keypair.publicKey;
    }
    return {
      id: key.id,
      type: key.type,
      default: key.default,
      privateKey: privateKey,
      publicKey: publicKey,
      jwk: await exportJWK(publicKey)
    }
  }

  async createDidDocument(keys: KeyMaterial[]): Promise<DIDDocument> {
    this.logger.log('Creating DID document');

    const didDocument: DIDDocument = {
      '@context': ['https://www.w3.org/ns/did/v1', 'https://w3c-ccg.github.io/lds-jws2020/contexts/v1/'],
      id: this.didId,
      verificationMethod: keys.map(key => {
        return {
          id: `${this.didId}#${key.id}`,
          type: 'JsonWebKey2020',
          controller: this.didId,
          publicKeyJwk: {
            kty: 'OKP',
            ...key.jwk,
          }
        }
      }),
      assertionMethod: keys.map(key => `${this.didId}#${key.id}`),
    }
    this.logger.log(`DID document created for ${this.didId}`);
    this.logger.debug(`DID document ${this.didId}\n${JSON.stringify(didDocument, null, 2)}`);
    return didDocument;
  }

  async createCredential(credentialConfig: CredentialConfig): Promise<CredentialInstance> {
    this.logger.log(`Creating verifiable credential for ${credentialConfig.id}`)
    const credential: Credential<CredentialSubject> = {
      '@context': ["https://www.w3.org/2018/credentials/v1"].concat(credentialConfig.context),
      type: ['VerifiableCredential'].concat(credentialConfig.type),
      id: `${this.config.server.publicAddress}/credentials/${credentialConfig.id}`,
      issuer: this.didId,
      issuanceDate: new Date().toISOString(),
      credentialSubject: credentialConfig.credentialSubject
    }
    const normalized = await jsonld.normalize(credential, {
      algorithm: 'URDNA2015'
    });
    const keyMaterial = ( (credentialConfig.keyId) ? this.keyMaterial.find(k => k.id === credentialConfig.keyId) : this.keyMaterial.find(k => k.default) ) || this.keyMaterial[0];
    this.logger.debug(`Signing with key ${keyMaterial.id}`);
    const hash = crypto.createHash(this.hashingAlgorithm(keyMaterial.type)).update(normalized).digest('hex');
    const signature = new CompactSign(new TextEncoder().encode(hash))
      .setProtectedHeader({alg: this.signingAlgorithm(keyMaterial.type), b64: false, crit: ['b64']});
    const jws = await signature.sign(keyMaterial.privateKey);
    
    const proof: Signature = {
      type: 'JsonWebSignature2020',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      jws: jws,
      verificationMethod: `${this.didId}#${keyMaterial.id}`
    }

    const verifiableCredential: VerifiableCredential<CredentialSubject> = {
      ...credential,
      proof: proof
    }
    this.logger.debug(`Verifiable credential ${credentialConfig.id}\n${JSON.stringify(verifiableCredential, null, 2)}`);

    return {
      id: credentialConfig.id,
      credential: verifiableCredential
    };
  }


  private existsFile(file: string): boolean {
    return fs.existsSync(path.join(this.config.storageLocation, file));
  }
  private getFile(file: string): string {
    return fs.readFileSync(path.join(this.config.storageLocation, file)).toString();
  }
  private writeFile(file: string, content: string) {
    fs.mkdirSync(this.config.storageLocation, {recursive: true});
    fs.writeFileSync(path.join(this.config.storageLocation, file), content);
  }
  private deleteFile(file: string) {
    fs.rmSync(path.join(this.config.storageLocation, file));
  }

  private hashingAlgorithm(type: 'EdDSA' | 'ES384' | 'X509'): string {
    switch(type) {
      case "EdDSA": return 'sha512'
      case "ES384": return 'sha384'
      case "X509": return 'sha256'
    }
  }
  private signingAlgorithm(type: 'EdDSA' | 'ES384' | 'X509'): string {
    switch(type) {
      case "EdDSA": return 'EdDSA'
      case "ES384": return 'ES384'
      case "X509": return 'PS256'
    }
  }
}