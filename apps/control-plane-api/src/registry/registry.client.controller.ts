import { CredentialAddressDto } from "@libs/control-plane-dtos";
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from "@nestjs/common";
import { CatalogDto } from "@libs/common-dsp";
import { OAuthGuard } from "../auth/oauth.guard";
import { Roles } from "../auth/roles.guard";
import { RegistryClientService } from "./registry.client.service";
import { RegistryService } from "./registry.service";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/registry")
export class RegistryClientController {
  constructor(
    private readonly registryClientService: RegistryClientService,
    private readonly registryService: RegistryService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("")
  @HttpCode(HttpStatus.OK)
  async requestCatalogs(): Promise<CatalogDto[]> {
    return await this.registryClientService.requestCatalogs();
  }

  @Get("addresses")
  @HttpCode(HttpStatus.OK)
  async requestAddresses(): Promise<CredentialAddressDto[]> {
    return await this.registryClientService.requestAddresses();
  }

  @Get("catalogs")
  @HttpCode(HttpStatus.OK)
  async getCatalogs(): Promise<CatalogDto[]> {
    this.logger.log(`Received request for all catalogs.`);
    return await this.registryService.getAllCatalogs();
  }
}
