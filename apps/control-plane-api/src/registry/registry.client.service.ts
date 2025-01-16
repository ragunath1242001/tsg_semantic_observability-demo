import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import { HttpStatus, Injectable, Logger, Optional } from "@nestjs/common";
import { CatalogDto } from "@tsg-dsp/common-dsp";
import axios from "axios";
import { VCAuthService } from "../vc-auth/vc.auth.service.js";
import { RegistryConfig } from "../config.js";
import { DSPClientError, DSPError } from "../utils/errors/error.js";

@Injectable()
export class RegistryClientService {
  constructor(
    private readonly vcAuthService: VCAuthService,
    @Optional()
    private readonly registryConfig: RegistryConfig
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  private checkRegistryConfigUrl() {
    if (!this.registryConfig || !this.registryConfig.registryUrl) {
      throw new DSPError(
        "No registry URL provided in the configuration.",
        HttpStatus.PRECONDITION_REQUIRED
      ).andLog(this.logger, "warn");
    }
  }

  private async axiosHeaders() {
    return {
      headers: {
        Authorization: `Bearer ${await this.vcAuthService.requestToken(
          this.registryConfig.registryDid ||
            `did:web:${this.registryConfig.registryUrl!.replace(":", "%3A")}`
        )}`
      }
    };
  }

  async requestAddresses(): Promise<CredentialAddress[]> {
    this.checkRegistryConfigUrl();
    try {
      const headers = await this.axiosHeaders();
      return (
        await axios.get(`${this.registryConfig.registryUrl}/addresses`, headers)
      ).data;
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
      const headers = await this.axiosHeaders();
      return (await axios.get(`${this.registryConfig?.registryUrl}`, headers))
        .data;
    } catch (err) {
      throw new DSPClientError("Could not request catalogs", err).andLog(
        this.logger,
        "warn"
      );
    }
  }
}
