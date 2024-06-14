import { CredentialAddress } from "@libs/control-plane-dtos";
import { HttpStatus, Injectable, Logger, Optional } from "@nestjs/common";
import { CatalogDto } from "@libs/common-dsp";
import axios from "axios";
import { AuthService } from "../auth/auth.service";
import { RegistryConfig } from "../config";
import { DSPClientError, DSPError } from "../utils/errors/error";

@Injectable()
export class RegistryClientService {
  constructor(
    private readonly authService: AuthService,
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
        Authorization: `Bearer ${await this.authService.requestToken(
          this.registryConfig.registryDid ||
            `did:web:${this.registryConfig.registryUrl!.replace(":", "%3A")}`
        )}`,
      },
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
