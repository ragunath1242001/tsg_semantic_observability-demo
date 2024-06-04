import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DIDDocument } from "did-resolver";
import { KeyMaterials } from "../model/credentials.dao.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DidServiceConfig, RootConfig } from "../config.js";
import { keyTypes, signingAlgorithm } from "../utils/keymapping.js";
import { AppError } from "../utils/error.js";
import { DIDDocuments, DIDService } from "../model/did.dao.js";

@Injectable()
export class DidService {
  private readonly didId: string;
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(DIDDocuments)
    private readonly didRepository: Repository<DIDDocuments>,
    @InjectRepository(DIDService)
    private readonly serviceRepository: Repository<DIDService>
  ) {
    this.didId = `did:web:${this.config.server.publicDomain.replace(
      ":",
      "%3A"
    )}`;
    this.initialized = this.init();
  }
  private readonly logger = new Logger(this.constructor.name);
  private cachedDocument?: DIDDocument = undefined;
  initialized: Promise<boolean>;

  async init() {
    const services: DidServiceConfig[] = [
      {
        id: `${this.didId}#oid4vci`,
        type: "OID4VCI",
        serviceEndpoint: this.config.server.publicAddress,
      },
      {
        id: `${this.didId}#presentation`,
        type: "PresentationService",
        serviceEndpoint: `${this.config.server.publicAddress}${
          process.env["EMBEDDED_FRONTEND"] ? "/api" : ""
        }/iatp/holder/presentation`,
      },
      ...this.config.didServices,
    ];
    for (const service of services) {
      try {
        await this.insertService(service);
      } catch (e) {
        this.logger.debug(
          `Service with id ${service.id} already exists, not overriding`
        );
      }
    }
    return true;
  }

  async getDidId(): Promise<string> {
    return this.didId;
  }

  async getDid(): Promise<DIDDocument> {
    if (this.cachedDocument) {
      return this.cachedDocument;
    }

    const did = await this.didRepository.find({});
    if (did.length === 0) {
      throw new AppError(`DID Document not ready yet`, HttpStatus.NOT_FOUND);
    }
    const services = await this.getServices();

    this.cachedDocument = {
      ...did[0].document,
      service: services?.map((s) => {
        return {
          id: s.id,
          type: s.type,
          serviceEndpoint: s.serviceEndpoint,
        };
      }),
    };

    return this.cachedDocument;
  }

  async getServices() {
    return await this.serviceRepository.find({});
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

  async insertService(config: DidServiceConfig): Promise<DIDService> {
    if (await this.serviceRepository.existsBy({ id: config.id })) {
      throw new AppError(
        `Service with id ${config.id} already exists`,
        HttpStatus.CONFLICT
      );
    }
    const service = await this.serviceRepository.save(config);
    this.cachedDocument = undefined;
    return service;
  }

  async updateService(id: string, config: DidServiceConfig) {
    if (await this.serviceRepository.existsBy({ id: id })) {
      const service = await this.serviceRepository.save({
        ...config,
        id: id,
      });
      this.cachedDocument = undefined;
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
  }

  async createDidDocument(keys: KeyMaterials[]): Promise<DIDDocument> {
    this.logger.log("Creating DID document");

    const didDocument: DIDDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/jws-2020/v1",
      ],
      id: this.didId,
      verificationMethod: keys.map((key) => {
        return {
          id: `${this.didId}#${key.id}`,
          type: "JsonWebKey2020",
          controller: this.didId,
          publicKeyJwk: {
            kty: keyTypes(key.type),
            alg: signingAlgorithm(key.type),
            ...key.publicKey,
          },
        };
      }),
      assertionMethod: keys.map((key) => `${this.didId}#${key.id}`),
    };
    this.logger.log(`DID document created for ${this.didId}`);
    this.logger.debug(
      `DID document ${this.didId}\n${JSON.stringify(didDocument, null, 2)}`
    );
    const existing = await this.didRepository.find({});
    if (existing[0]) {
      await this.didRepository.clear();
    }
    await this.didRepository.save({
      document: didDocument,
    });
    this.cachedDocument = undefined;
    return didDocument;
  }
}
