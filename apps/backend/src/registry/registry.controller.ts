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
import { CredentialAddressDto } from "@libs/dtos";
import { VerifiablePresentationGuard } from "../auth/verifiablePresentation.guard";

@UseGuards(VerifiablePresentationGuard)
@Controller("registry")
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCatalogs(): Promise<CatalogDto[]> {
    this.logger.log(`Received request for all catalogs.`);
    const catalogs = await this.registryService.getAllCatalogs();
    return Promise.all(
      catalogs.map((catalog) => {
        return catalog.serialize();
      })
    );
  }

  @Get("addresses")
  async requestAddresses(): Promise<CredentialAddressDto[]> {
    return await this.registryService.fetchAddresses();
  }
}
