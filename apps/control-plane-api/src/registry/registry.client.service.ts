import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import { HttpStatus, Injectable, Logger, Optional } from "@nestjs/common";
import { CatalogDto } from "@tsg-dsp/common-dsp";
import axios, { AxiosInstance } from "axios";
import { VCAuthService } from "../vc-auth/vc.auth.service.js";
import { RegistryConfig } from "../config.js";
import { DSPClientError, DSPError } from "../utils/errors/error.js";

@Injectable()
export class RegistryClientService {
  private readonly axiosInstance: AxiosInstance;
  private readonly etagCache = new Map<string, string>();
  private addresses: CredentialAddress[] = [];
  private catalogs: CatalogDto[] = [];
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly vcAuthService: VCAuthService,
    @Optional() private readonly registryConfig: RegistryConfig
  ) {
    this.axiosInstance = axios.create();
    this.axiosInstance.interceptors.response.use((response) => {
      const etag = response.headers["etag"];
      if (etag && response.config.url) {
        this.etagCache.set(response.config.url, etag);
      }
      return response;
    });
  }

  private checkRegistryConfigUrl() {
    if (!this.registryConfig || !this.registryConfig.registryUrl) {
      throw new DSPError(
        "No registry URL provided in the configuration.",
        HttpStatus.PRECONDITION_REQUIRED
      ).andLog(this.logger, "warn");
    }
  }

  private async getHeaders(url: string) {
    const token = await this.vcAuthService.requestToken(
      this.registryConfig.registryDid ||
        `did:web:${this.registryConfig.registryUrl!.replace(":", "%3A")}`
    );
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`
    };
    const etag = this.etagCache.get(url);
    if (etag) {
      headers["If-None-Match"] = etag;
    }
    return { headers };
  }

  async requestAddresses(): Promise<CredentialAddress[]> {
    this.checkRegistryConfigUrl();
    try {
      const url = `${this.registryConfig.registryUrl}/addresses`;
      const response = await this.axiosInstance.get(
        url,
        await this.getHeaders(url)
      );
      if (response.status === HttpStatus.OK) {
        this.addresses = response.data;
      } else if (response.status === HttpStatus.NOT_MODIFIED) {
        this.logger.debug("Address list not modified");
      }
      return this.addresses;
    } catch (err) {
      throw new DSPClientError("Could not request addresses", err).andLog(
        this.logger,
        "warn"
      );
    }
  }

  async requestCatalogs(): Promise<CatalogDto[]> {
    this.checkRegistryConfigUrl();
    try {
      const url = this.registryConfig.registryUrl!;
      const response = await this.axiosInstance.get(
        url,
        await this.getHeaders(url)
      );
      if (response.status === HttpStatus.OK) {
        this.catalogs = response.data;
      } else if (response.status === HttpStatus.NOT_MODIFIED) {
        this.logger.debug("Catalog list not modified");
      }
      return this.catalogs;
    } catch (err) {
      throw new DSPClientError("Could not request catalogs", err).andLog(
        this.logger,
        "warn"
      );
    }
  }
}
