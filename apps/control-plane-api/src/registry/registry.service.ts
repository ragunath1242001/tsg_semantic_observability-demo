import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import {
  HttpStatus,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Optional,
} from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { CatalogDto } from "@tsg-dsp/common-dsp";
import { DIDDocument } from "did-resolver";
import { Repository } from "typeorm";
import { AuthService } from "../auth/auth.service";
import { RegistryConfig } from "../config";
import { DspClientService } from "../dsp/client/client.service";

import { normalizeAddress } from "../utils/address";
import { DSPError } from "../utils/errors/error";
import { DidResolverService } from "./did.resolver.service";
import { RegistryDao } from "../model/registry.dao";
import { isFulfilled } from "../utils/promises";

@Injectable()
export class RegistryService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(RegistryDao)
    private readonly registryRepository: Repository<RegistryDao>,
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
    if (this.registryConfig?.useRegistry === true) {
      const interval = setInterval(
        this.crawl.bind(this),
        this.registryConfig.registryIntervalInMilliseconds
      );
      this.schedulerRegistry.addInterval("crawl", interval);
    }
  }

  async fetchDidDocuments(): Promise<DIDDocument[]> {
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

  async fetchAddresses(): Promise<CredentialAddress[]> {
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

  async getCatalog(credentialAddress: CredentialAddress): Promise<CatalogDto> {
    return await this.dsp.requestCatalog(
      normalizeAddress(credentialAddress.address, 0, "catalog", "request"),
      credentialAddress.didId
    );
  }

  async saveToDatabase(catalog: CatalogDto) {
    const registryObj = this.registryRepository.create({
      catalogId: catalog["@id"],
      catalogJson: catalog,
    });
    await this.registryRepository.save(registryObj);
  }

  async crawl() {
    this.logger.debug("Crawling addresses and catalogs.");
    const addresses = await this.fetchAddresses();
    this.logger.debug(`Addresses to crawl: ${JSON.stringify(addresses)}`);
    const results = await Promise.allSettled(
      addresses.map(async (address) => {
        try {
          this.logger.debug(`Crawling address ${address}`);
          const catalog = await this.getCatalog(address);
          this.logger.debug(
            `Crawled address ${address.address} (${address.didId})`
          );
          return catalog;
        } catch (err) {
          this.logger.debug(
            `Error during crawling address ${address.address} (${address.didId}): ${err}`
          );
        }
      })
    );

    const catalogs = results
      .filter(isFulfilled)
      .map((response) => response.value);

    if (catalogs.length == 0) {
      this.logger.log("No other dataspace participants found.");
      return;
    }

    await this.registryRepository.clear();
    return Promise.all(
      catalogs.map(async (catalog) => {
        await this.saveToDatabase(catalog);
      })
    );
  }

  async getAllCatalogs(): Promise<CatalogDto[]> {
    if (!this.registryConfig?.useRegistry) {
      throw new DSPError(
        "Registry not enabled in settings",
        HttpStatus.NOT_IMPLEMENTED
      );
    }
    const registryDaos = await this.registryRepository.find({});
    return registryDaos.map((reg) => reg.catalogJson);
  }
}
