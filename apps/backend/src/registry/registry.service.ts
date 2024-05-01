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
    this.logger.debug(
      `Found credentials for ${credentials.map((c) => c.targetDid)}`
    );
    const didDocuments = await Promise.all(
      credentials.map(async (credential) => {
        try {
          return await this.didResolverService.resolve(credential.targetDid);
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
          (item) => item.address === obj.address
        ) === index
    );
  }

  async getCatalog(
    credentialAddress: CredentialAddressDto
  ): Promise<CatalogDto> {
    return await this.dsp.requestCatalog(
      normalizeAddress(credentialAddress.address, 0, "catalog", "request"),
      credentialAddress.didId
    );
  }

  async saveToDatabase(catalog: CatalogDto) {
    const catalogInst = await deserialize<Catalog>(catalog);
    const resource = this.resourceRepository.create(new Resource(catalogInst));
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
      await Promise.allSettled(
        catalogInst.dataset.map(async (dataset) => {
          try {
            await this.catalogService.updateDataset(dataset.id, dataset);
          } catch (err) {
            if (
              err instanceof DSPError &&
              err.appResponse.code === HttpStatus.NOT_FOUND
            ) {
              this.logger.log(
                `Dataset with id ${dataset.id} does not exist yet, creating adding new dataset to the catalog`
              );
              await this.catalogService.addDataset(dataset, catalogObj.id);
            }
          }
        })
      );
    }
  }

  async crawl() {
    this.logger.log("Crawling addresses and catalogs.");
    const addresses = await this.fetchAddresses();
    this.logger.debug(`Addresses to crawl: ${JSON.stringify(addresses)}`);
    return await Promise.allSettled(
      addresses.map(async (address) => {
        try {
          this.logger.debug(`Crawling address ${address}`);
          const catalog = await this.getCatalog(address);
          const result = await this.saveToDatabase(catalog);
          this.logger.debug(
            `Crawled address ${address.address} (${address.didId}) and stored to database`
          );
          return result;
        } catch (err) {
          this.logger.debug(
            `Error during crawling address ${address.address} (${address.didId}): ${err}`
          );
        }
      })
    );
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
