import {
  HttpStatus,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { RegistryConfig } from "../config";
import { InjectRepository } from "@nestjs/typeorm";
import {
  CatalogDao,
  DataServiceDao,
  DatasetDao,
  ResourceDao,
} from "../model/dsp/catalog/catalog.dao";
import { DidResolverService } from "./did.resolver.service";
import { DspClientService } from "../dsp/client/client.service";
import { normalizeAddress } from "../utils/address";
import { CatalogDto } from "@tsg-dsp/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { DIDDocument } from "did-resolver";
import { Repository } from "typeorm";
import { Catalog, Dataset, Resource } from "../model/dsp/catalog/catalog";
import { deserialize } from "../model/serialize";
import { CatalogService } from "../dsp/catalog/catalog.service";
import { CredentialAddressDto } from "@libs/dtos";
import { AuthService } from "../auth/auth.service";
import { DSPError } from "../utils/errors/error";

@Injectable()
export class RegistryService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(CatalogDao)
    private readonly catalogRepository: Repository<CatalogDao>,
    @InjectRepository(ResourceDao)
    private readonly resourceRepository: Repository<ResourceDao>,
    @InjectRepository(DatasetDao)
    private readonly datasetRepository: Repository<DatasetDao>,
    @InjectRepository(DataServiceDao)
    private readonly dataServiceRepository: Repository<DataServiceDao>,
    private readonly catalogService: CatalogService,
    private readonly didResolverService: DidResolverService,
    private readonly dsp: DspClientService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly authService: AuthService,
    @Optional()
    private readonly registryConfig?: RegistryConfig
  ) {}

  private readonly logger = new Logger(RegistryService.name);

  onApplicationBootstrap() {
    this.createJob();
  }

  private async createJob() {
    this.logger.log("Creating job for registry interval.");
    if (this.registryConfig?.isRegistry === true) {
      const interval = setInterval(
        this.crawl.bind(this),
        this.registryConfig.registryIntervalInMilliseconds
      );
      this.schedulerRegistry.addInterval("crawl", interval);
    }
  }

  private async fetchDidDocuments(): Promise<DIDDocument[]> {
    const credentials = await this.authService.walletClient.getCredentials();
    const didDocuments = await Promise.all(
      credentials.map((credential) => {
        try {
          return this.didResolverService.resolve(credential.targetDid);
        } catch (e) {
          this.logger.warn(
            `Could not resolve did document for ${credential.targetDid}, error: ${e}`
          );
        }
      })
    );
    return didDocuments.filter(
      (didDocument): didDocument is DIDDocument => didDocument !== undefined
    );
  }

  async fetchAddresses(): Promise<CredentialAddressDto[]> {
    const didDocuments = await this.fetchDidDocuments();
    const credentialAddresses = didDocuments.flatMap((didDocument) => {
      return didDocument
        .service!.filter((service) => service.type === "connector")
        .filter((service) => typeof service.serviceEndpoint === "string")
        .map((service) => {
          return {
            didId: didDocument.id,
            address: service.serviceEndpoint as string,
          };
        });
    });

    // Return unique addresses
    return credentialAddresses.filter(
      (obj, index) =>
        credentialAddresses.findIndex(
          (item) => item.address === item.address
        ) === index
    );
  }
  async fetchFlatAddresses(): Promise<string[]> {
    const didDocuments = await this.fetchDidDocuments();
    const addresses = didDocuments.flatMap((didDocument: DIDDocument) => {
      if (didDocument.service) {
        return didDocument.service
          .filter((service) => service.type === "connector")
          .filter((service) => typeof service.serviceEndpoint === "string")
          .flatMap((service) => service.serviceEndpoint);
      }
    });
    // Return unique addresses
    return [...new Set(addresses)];
  }

  async getCatalogs(
    credentialAddresses: CredentialAddressDto[]
  ): Promise<CatalogDto[]> {
    const catalogPromises = Promise.all(
      credentialAddresses.map((credentialAddress) =>
        this.dsp.requestCatalog(
          normalizeAddress(credentialAddress.address, 0, "catalog", "request"),
          credentialAddress.didId
        )
      )
    );
    return await catalogPromises;
  }

  async saveToDatabase(catalogs: CatalogDto[]) {
    const promises = Promise.all(
      catalogs.map(async (catalog) => {
        const catalogInst = await deserialize<Catalog>(catalog);
        const resource = this.resourceRepository.create(
          new Resource(catalogInst)
        );
        const dataset = this.datasetRepository.create({
          ...new Dataset({
            ...catalogInst,
          }),
          _resource: resource,
        });
        const catalogObj = this.catalogRepository.create(catalogInst);

        if (catalogInst.service) {
          catalogObj._services = catalogInst.service.map((dservice) =>
            this.dataServiceRepository.create(dservice)
          );
        }

        catalogObj._dataset = await this.datasetRepository.save(dataset);
        await this.catalogRepository.save(catalogObj);
        if (catalogInst.dataset) {
          await Promise.all(
            catalogInst.dataset.map(async (dS) => {
              try {
                await this.catalogService.addDataset(dS, catalogObj.id);
              } catch (err) {
                if (
                  err instanceof DSPError &&
                  err.appResponse.status === HttpStatus.CONFLICT
                ) {
                  await this.catalogService.updateDataset(dS.id, dS);
                }
              }
            })
          );
        }
      })
    );
    return promises;
  }

  async crawl() {
    this.logger.log("Crawling addresses and catalogs.");
    const addresses = await this.fetchAddresses();
    const catalogs = await this.getCatalogs(addresses);
    return await this.saveToDatabase(catalogs);
  }

  async getAllCatalogs(): Promise<Catalog[]> {
    const catalogDaos = await this.catalogRepository.find({
      relations: {
        _datasets: {
          _resource: true,
          _distribution: {
            _accessService: {
              _resource: true,
            },
          },
        },
        _services: true,
        _dataset: {
          _resource: true,
          _distribution: {
            _accessService: {
              _resource: true,
            },
          },
        },
      },
    });
    return catalogDaos.map((catalog) => new Catalog(catalog));
  }
}
