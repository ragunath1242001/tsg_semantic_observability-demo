import { Controller, Get, Logger, UseGuards } from "@nestjs/common";
import { CatalogDto } from "@tsg-dsp/common";
import { CredentialAddressDto } from "@libs/dtos";
import { RegistryClientService } from "./registry.client.service";
import { ManagementGuard } from "../auth/management.guard";

@UseGuards(ManagementGuard)
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
