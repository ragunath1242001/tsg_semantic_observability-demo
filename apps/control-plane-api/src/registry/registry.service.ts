import {
  HttpStatus,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Optional
} from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import {
  isFulfilled,
  Paginated,
  PaginationOptionsDto
} from "@tsg-dsp/common-api";
import { CatalogDto } from "@tsg-dsp/common-dsp";
import { resolveDid } from "@tsg-dsp/common-signing-and-validation";
import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import { DIDDocument } from "did-resolver";
import { Repository } from "typeorm";

import { RegistryConfig } from "../config.js";
import { DspClientService } from "../dsp/client/client.service.js";
import { RegistryDao } from "../model/registry.dao.js";
import { normalizeAddress } from "../utils/address.js";
import { DSPError } from "../utils/errors/error.js";
import { VCAuthService } from "../vc-auth/vc.auth.service.js";
import { Credential } from "../vc-auth/wallets/walletClient.js";

@Injectable()
export class RegistryService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(RegistryDao)
    private readonly registryRepository: Repository<RegistryDao>,
    private readonly dsp: DspClientService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly vcAuthService: VCAuthService,
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
    let credentials: Credential[];
    try {
      credentials = await this.vcAuthService.walletClient.getCredentials();
      this.logger.debug(
        `Found credentials for ${credentials.map((c) => c.targetDid)}`
      );
    } catch (_) {
      this.logger.debug("No credentials found. Registry will not work.");
      return [];
    }
    const uniqueDids = [
      ...new Set(
        credentials
          .map((c) => c.targetDid)
          .filter((targetDid) => targetDid.startsWith("did:"))
      )
    ];
    const didDocuments = await Promise.all(
      uniqueDids.map(async (did) => {
        try {
          return await resolveDid(did);
        } catch (e) {
          this.logger.warn(
            `Could not resolve did document for ${did}, error: ${e}`
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
      return (
        didDocument.service
          ?.filter((service) => service.type === "connector")
          ?.filter((service) => typeof service.serviceEndpoint === "string")
          ?.map((service) => {
            return {
              didId: didDocument.id,
              address: service.serviceEndpoint as string
            };
          }) ?? []
      );
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
      participantId: catalog.participantId,
      catalogJson: catalog
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

  async getAllCatalogs(
    paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<CatalogDto[]>> {
    if (!this.registryConfig?.useRegistry) {
      throw new DSPError(
        "Registry not enabled in settings",
        HttpStatus.NOT_IMPLEMENTED
      );
    }
    const [registryDaos, itemCount] =
      await this.registryRepository.findAndCount({
        skip: paginationOptions.skip,
        take: paginationOptions.take,
        order: {
          [paginationOptions.order_by]: paginationOptions.order
        }
      });
    return {
      data: registryDaos.map((reg) => reg.catalogJson),
      total: itemCount
    };
  }

  async getCatalogByParticipantId(participantId: string): Promise<CatalogDto> {
    const catalog = await this.registryRepository.findOne({
      where: {
        participantId
      }
    });
    if (!catalog) {
      throw new DSPError(
        `Catalog with participant ID ${participantId} not found in registry.`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    return catalog.catalogJson;
  }
}
