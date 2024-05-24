import { CredentialAddressDto } from "@libs/dtos";
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from "@nestjs/common";
import { CatalogDto } from "@tsg-dsp/common";
import { RegistryService } from "./registry.service";
import { OAuthGuard } from "../auth/oauth.guard";
import { Roles } from "../auth/roles.guard";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("registry")
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCatalogs(): Promise<CatalogDto[]> {
    this.logger.log(`Received request for all catalogs.`);
    return await this.registryService.getAllCatalogs();
  }

  @Get("addresses")
  async requestAddresses(): Promise<CredentialAddressDto[]> {
    return await this.registryService.fetchAddresses();
  }
}
