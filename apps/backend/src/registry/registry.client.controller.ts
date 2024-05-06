import { CredentialAddressDto } from "@libs/dtos";
import { Controller, Get, Logger, UseGuards } from "@nestjs/common";
import { CatalogDto } from "@tsg-dsp/common";
import { OAuthGuard } from "../auth/oauth.guard";
import { Roles } from "../auth/roles.guard";
import { RegistryClientService } from "./registry.client.service";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/registry")
export class RegistryClientController {
  constructor(private readonly registryClientService: RegistryClientService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("")
  async requestCatalogs(): Promise<CatalogDto[]> {
    return await this.registryClientService.requestCatalogs();
  }

  @Get("addresses")
  async requestAddresses(): Promise<CredentialAddressDto[]> {
    return await this.registryClientService.requestAddresses();
  }
}
