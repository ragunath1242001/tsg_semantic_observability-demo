import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { KeyLike, importPKCS8, importX509, generateKeyPair, exportJWK } from "jose";
import { Not, Repository } from "typeorm";
import { KeyConfig, RootConfig } from "../config.js";
import { KeyMaterials } from "../model/credentials.dao.js";
import { AppError } from "../utils/error.js";
import { InjectRepository } from "@nestjs/typeorm";
import { DidService } from "./did.service.js";

@Injectable()
export class KeyService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(KeyMaterials) private readonly keyRepository: Repository<KeyMaterials>,
    private readonly didService: DidService
  ) {
    this.init();
  }
  private readonly logger = new Logger(this.constructor.name);

  async init() {
    const keys = await Promise.all(this.config.keys.map(k => this.createKeyMaterial(k)));
    await this.didService.createDidDocument(keys);
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

  async getDefaultKey(): Promise<KeyMaterials> {
    const key = await this.keyRepository.findOneBy({default: true});
    if (key === null) {
      throw new AppError(`No default key present`, HttpStatus.NOT_FOUND)
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
    await this.didService.createDidDocument(await this.getKeys());
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
    await this.didService.createDidDocument(await this.getKeys());
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
}