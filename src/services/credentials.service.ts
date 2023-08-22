import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CredentialConfig, KeyConfig, RootConfig } from "../config.js";
import { DIDDocument } from "did-resolver";
import { CompactSign, KeyLike, exportJWK, generateKeyPair, importJWK, importPKCS8, importX509 } from "jose";
import { Credential, CredentialSubject, Signature, VerifiableCredential } from "../model/credential.dto.js";
import jsonld from "jsonld";
import crypto from "crypto";
import { AppError } from "../utils/error.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Credentials, DIDDocuments, KeyMaterials } from "../model/credentials.dao.js";
import { Not, Repository } from "typeorm";

@Injectable()
export class CredentialsService {
  private readonly didId: string;
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(DIDDocuments) private readonly didRepository: Repository<DIDDocuments>,
    @InjectRepository(KeyMaterials) private readonly keyRepository: Repository<KeyMaterials>,
    @InjectRepository(Credentials) private readonly credentialRepository: Repository<Credentials>,
  ) {
    this.init();
    this.didId = `did:web:${this.config.server.publicDomain.replace(':','%3A')}`
  }
  private readonly logger = new Logger(this.constructor.name);
  
  async init() {
    this.logger.log('Initializing CredentialService');
    const keys = await Promise.all(this.config.keys.map(k => this.createKeyMaterial(k)));
    await this.createDidDocument(keys);
    await Promise.all(this.config.credentials.map(c => this.createCredential(c)));
  }

  async getDid(): Promise<DIDDocument | undefined> {
    const did = await this.didRepository.findOneBy({id: 0});
    return did?.document;
  }

  async getKeys(): Promise<KeyMaterials[]> {
    return this.keyRepository.find({});
  }

  async getKey(keyId: string): Promise<KeyMaterials> {
    const key = await this.keyRepository.findOneBy({id: keyId});
    if (key === null) {
      throw new AppError(`Key with identifier ${keyId} can't be found`, HttpStatus.NOT_FOUND)
    }
    return key;
  }

  async addKey(keyConfig: KeyConfig): Promise<KeyMaterials> {
    const existing = await this.keyRepository.findOneBy({id: keyConfig.id});
    if (existing) {
      throw new AppError(`Key with identifier ${keyConfig.id} already exists`, HttpStatus.CONFLICT);
    }
    const key = await this.createKeyMaterial(keyConfig);
    if (keyConfig.default) {
      this.changeDefaultKey(keyConfig.id);
    }
    await this.createDidDocument(await this.getKeys());
    return key;
  }

  async changeDefaultKey(keyId: string) {
    await this.keyRepository.update({id: Not(keyId)},{default: false});
    await this.keyRepository.update({id: keyId},{default: true});
  }

  async deleteKey(keyId: string) {
    const key = await this.keyRepository.findOneBy({id: keyId});
    if (key === null) {
      throw new AppError(`Key with identifier ${keyId} can't be found`, HttpStatus.NOT_FOUND)
    }

    await this.keyRepository.softRemove(key)
    await this.createDidDocument(await this.getKeys());
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
  
  async createKeyMaterial(key: KeyConfig): Promise<KeyMaterials> {
    this.logger.log(`Loading key material for key ${key.id}`);
    let privateKey: KeyLike;
    let publicKey: KeyLike;
    const existing = await this.keyRepository.findOneBy({id: key.id});
    
    if (key.existingKey && key.existingCertificate) {
      this.logger.log(`Loading existing PKCS#8 key and X.509 certificate`);
      privateKey = await importPKCS8(key.existingKey, 'RSA');
      publicKey = await importX509(key.existingCertificate, 'RSA');
    } else if (existing) {
      this.logger.log(`Loaded key from repository`);
      return existing;
    } else {
      this.logger.log(`Creating new keypair with ${key.type}`);
      const keypair = await generateKeyPair(key.type);
      privateKey = keypair.privateKey;
      publicKey = keypair.publicKey;
    }

    return await this.keyRepository.save({
      id: key.id,
      type: key.type,
      default: key.default,
      privateKey: await exportJWK(privateKey),
      publicKey: await exportJWK(publicKey)
    })
  }

  async createDidDocument(keys: KeyMaterials[]): Promise<DIDDocument> {
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
            ...key.publicKey,
          }
        }
      }),
      assertionMethod: keys.map(key => `${this.didId}#${key.id}`),
    }
    this.logger.log(`DID document created for ${this.didId}`);
    this.logger.debug(`DID document ${this.didId}\n${JSON.stringify(didDocument, null, 2)}`);
    await this.didRepository.save({
      id: 0,
      document: didDocument
    });
    return didDocument;
  }

  async createCredential(credentialConfig: CredentialConfig): Promise<Credentials> {
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
    let keyMaterial: KeyMaterials | null;
    if (credentialConfig.keyId) {
      keyMaterial = await this.keyRepository.findOneByOrFail({id: credentialConfig.keyId});
    } else {
      keyMaterial = await this.keyRepository.findOneBy({default: true});
    }
    if (keyMaterial === null) {
      throw new AppError(`No matching key found, either provide a correct keyId in the request or set a key to be default`, HttpStatus.BAD_REQUEST);
    }
    this.logger.debug(`Signing with key ${keyMaterial.id}`);
    const hash = crypto.createHash(this.hashingAlgorithm(keyMaterial.type)).update(normalized).digest('hex');
    const signature = new CompactSign(new TextEncoder().encode(hash))
      .setProtectedHeader({alg: this.signingAlgorithm(keyMaterial.type), b64: false, crit: ['b64']});
    const privateKey = await importJWK(keyMaterial.privateKey);
    const jws = await signature.sign(privateKey);
    
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
    return await this.credentialRepository.save({
      id: credentialConfig.id,
      credential: verifiableCredential
    });
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