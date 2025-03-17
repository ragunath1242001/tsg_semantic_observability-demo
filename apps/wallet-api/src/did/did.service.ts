import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import { PaginationOptionsDto } from "@tsg-dsp/common-api";
import { DIDMethod } from "@tsg-dsp/common-signing-and-validation";
import { DIDDocument, Service, VerificationMethod } from "did-resolver";
import { Like, Repository } from "typeorm";

import { DidServiceConfig, RootConfig } from "../config.js";
import { KeyMaterialDao } from "../model/credentials.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../model/did.dao.js";
import { createServices, createVerificationMethods } from "../utils/did.js";
import { DidTdwStrategy } from "./tdw/did.tdw.strategy.js";
import { DidWebStrategy } from "./web/did.web.strategy.js";

export interface DidStrategy {
  createDid(config: RootConfig): string;
  createDidDocument(
    config: RootConfig,
    didId: string,
    keys: KeyMaterialDao[],
    services: DidServiceConfig[]
  ): Promise<{ didId: string; didDocument: DIDDocument }>;
  updateDidDocument(
    didDocument: DIDDocument,
    verificationMethods?: VerificationMethod[],
    services?: Service[]
  ): Promise<DIDDocument>;
  setDefaultKey(didDocument: DIDDocument, key: KeyMaterialDao): void;
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
        throw Error(
          `DID method ${didMethod} is not supported to provide DID from the TSG Wallet`
        );
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
        id: `${this.didId}#DCP-credentialService`,
        type: "CredentialService",
        serviceEndpoint: `${this.config.server.publicAddress}/api/dcp`
      },
      {
        id: `${this.didId}#DCP-issuerService`,
        type: "IssuerService",
        serviceEndpoint: `${this.config.server.publicAddress}/api/dcp/issuer`
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
      } catch (_) {
        this.logger.debug(
          `Service with id ${service.id} already exists, not overriding`
        );
      }
    }
  }

  async getPaginatedServices(paginationOptions: PaginationOptionsDto) {
    const [services, itemCount] = await this.serviceRepository.findAndCount({
      where: {
        id: Like(`${this.didId}%`)
      },
      ...paginationOptions.typeOrm
    });
    return {
      data: services,
      total: itemCount
    };
  }

  private async getServices() {
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
    defaultKey: KeyMaterialDao
  ): Promise<DIDDocument> {
    let existingDidDocument: DIDDocument;
    try {
      existingDidDocument = await this.getDid();
    } catch (_) {
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

  async createDidDocument(keys: KeyMaterialDao[]): Promise<DIDDocument> {
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

  async updateDidDocumentKeys(keys: KeyMaterialDao[]) {
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

  async setDidDefaultKey(key: KeyMaterialDao) {
    this.didStrategy.setDefaultKey(await this.getDid(), key);
  }
}
