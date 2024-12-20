import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DIDDocument, Service, VerificationMethod } from "did-resolver";
import { KeyMaterials } from "../model/credentials.dao.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Like, Repository } from "typeorm";
import { DidServiceConfig, RootConfig } from "../config.js";
import { AppError } from "../utils/error.js";
import { DIDDocuments, DIDLogs, DIDService } from "../model/did.dao.js";
import { DidWebStrategy } from "./web/did.web.strategy.js";
import { DidTdwStrategy } from "./tdw/did.tdw.strategy.js";
import {
  createServices,
  createVerificationMethods,
  DIDMethod
} from "../utils/did.js";

export interface DidStrategy {
  createDid(config: RootConfig): string;
  createDidDocument(
    config: RootConfig,
    didId: string,
    keys: KeyMaterials[],
    services: DidServiceConfig[]
  ): Promise<{ didId: string; didDocument: DIDDocument }>;
  updateDidDocument(
    didDocument: DIDDocument,
    verificationMethods?: VerificationMethod[],
    services?: Service[]
  ): Promise<DIDDocument>;
  setDefaultKey(didDocument: DIDDocument, key: KeyMaterials): void;
}

@Injectable()
export class DidService {
  private didId: string;
  private readonly didStrategy: DidStrategy;
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(DIDDocuments)
    private readonly didRepository: Repository<DIDDocuments>,
    @InjectRepository(DIDService)
    private readonly serviceRepository: Repository<DIDService>,
    @InjectRepository(DIDLogs)
    private readonly didLogsRepository: Repository<DIDLogs>
  ) {
    this.didStrategy = this.retrieveDidStrategy(config.did.method);
    this.didId = this.didStrategy.createDid(config);
  }
  private readonly logger = new Logger(this.constructor.name);
  private cachedDocument?: DIDDocument = undefined;

  private retrieveDidStrategy(didMethod: string): DidStrategy {
    switch (didMethod) {
      case DIDMethod.WEB:
        return new DidWebStrategy();
      case DIDMethod.TDW:
        return new DidTdwStrategy(this.didLogsRepository);
      default:
        throw Error("DID method is not supported");
    }
  }

  async getDidId(): Promise<string> {
    return this.didId;
  }

  async getDid(): Promise<DIDDocument> {
    if (this.cachedDocument) {
      return this.cachedDocument;
    }
    const did = await this.didRepository.find({
      where: {
        document: Like(`%"id":"${this.config.did.method}%`)
      }
    });
    if (did.length === 0) {
      throw new AppError(`DID Document not ready yet`, HttpStatus.NOT_FOUND);
    }
    this.cachedDocument = did[0].document;
    return this.cachedDocument;
  }

  private initServices(): DidServiceConfig[] {
    return [
      {
        id: `${this.didId}#oid4vci`,
        type: "OID4VCI",
        serviceEndpoint: `https://${this.config.server.publicDomain}`
      },
      {
        id: `${this.didId}#presentation`,
        type: "PresentationService",
        serviceEndpoint: `${this.config.server.publicAddress}/api/iatp/holder/presentation`
      },
      {
        id: `${this.didId}#management`,
        type: "Management",
        serviceEndpoint: `${this.config.server.publicAddress}/api`
      },
      ...this.config.didServices
    ];
  }

  private async saveInitServices(services: Service[]) {
    for (const service of services) {
      try {
        await this.insertService(
          {
            id: service.id,
            type: service.type,
            serviceEndpoint: service.serviceEndpoint as string
          },
          true
        );
      } catch (e) {
        this.logger.debug(
          `Service with id ${service.id} already exists, not overriding`
        );
      }
    }
  }

  async getServices() {
    return await this.serviceRepository.find({
      where: {
        id: Like(`${this.didId}%`)
      }
    });
  }

  async getService(id: string) {
    const service = await this.serviceRepository.findOneBy({ id: id });
    if (!service) {
      throw new AppError(
        `DID Service with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return service;
  }

  async insertService(
    config: DidServiceConfig,
    init?: boolean
  ): Promise<DIDService> {
    if (await this.serviceRepository.existsBy({ id: config.id })) {
      throw new AppError(
        `Service with id ${config.id} already exists`,
        HttpStatus.CONFLICT
      );
    }
    const service = await this.serviceRepository.save(config);
    if (!init) {
      await this.updateDidDocumentServices(await this.getServices());
    }

    return service;
  }

  async updateService(id: string, config: DidServiceConfig) {
    if (await this.serviceRepository.existsBy({ id: id })) {
      const service = await this.serviceRepository.save({
        ...config,
        id: id
      });
      await this.updateDidDocumentServices(await this.getServices());
      return service;
    } else {
      throw new AppError(
        `Service with id ${config.id} does not exists`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  async deleteService(id: string) {
    const service = await this.getService(id);
    await this.serviceRepository.remove(service);
    await this.updateDidDocumentServices(await this.getServices());
  }

  private async saveDidDocument(didDocument: DIDDocument) {
    const existing = await this.didRepository.find({
      where: {
        document: Like(`%"id":"${this.config.did.method}%`)
      }
    });
    if (existing) {
      await Promise.allSettled(
        existing.map(async (e) => await this.didRepository.delete(e.id))
      );
    }
    await this.didRepository.save({
      document: didDocument
    });
    this.cachedDocument = undefined;
  }

  async checkExistingDidDocument(
    defaultKey: KeyMaterials
  ): Promise<DIDDocument> {
    let existingDidDocument: DIDDocument;
    try {
      existingDidDocument = await this.getDid();
    } catch (e) {
      throw new AppError(`DID Document not ready yet`, HttpStatus.NOT_FOUND);
    }
    this.didId = existingDidDocument.id;
    await this.setDidDefaultKey(defaultKey);
    this.logger.log(`Using existing DID Document for ${this.didId}`);
    this.logger.debug(
      `DID document ${this.didId}\n${JSON.stringify(
        existingDidDocument,
        null,
        2
      )}`
    );
    return existingDidDocument;
  }

  async createDidDocument(keys: KeyMaterials[]): Promise<DIDDocument> {
    const { didId, didDocument } = await this.didStrategy.createDidDocument(
      this.config,
      this.didId,
      keys,
      this.initServices()
    );

    this.didId = didId;
    if (didDocument.service != null) {
      await this.saveInitServices(didDocument.service!);
    }
    await this.saveDidDocument(didDocument);

    return didDocument;
  }

  async updateDidDocumentKeys(keys: KeyMaterials[]) {
    let didDocument = await this.getDid();
    didDocument = await this.didStrategy.updateDidDocument(
      didDocument,
      createVerificationMethods(
        didDocument.id,
        keys,
        this.config.did.keyFormat
      ),
      didDocument.service
    );
    await this.saveDidDocument(didDocument);
  }

  private async updateDidDocumentServices(services: DIDService[]) {
    let didDocument = await this.getDid();
    didDocument = await this.didStrategy.updateDidDocument(
      didDocument,
      didDocument.verificationMethod,
      createServices(services)
    );
    await this.saveDidDocument(didDocument);
  }

  async setDidDefaultKey(key: KeyMaterials) {
    this.didStrategy.setDefaultKey(await this.getDid(), key);
  }
}
