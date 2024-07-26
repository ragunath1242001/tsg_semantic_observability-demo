import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from "@nestjs/common";
import { CatalogDto } from "@tsg-dsp/common-dsp";
import { OAuthGuard } from "../auth/oauth.guard";
import { Roles } from "../auth/roles.guard";
import { RegistryClientService } from "./registry.client.service";
import { RegistryService } from "./registry.service";
import {
  ApiOAuth2,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
} from "@nestjs/swagger";
import { CredentialAddressDto } from "./registry.schema";
import { ApiForbiddenResponseDefault } from "../utils/swagger";
import { CatalogSchema } from "../dsp/catalog/catalog.schema";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/registry")
@ApiTags("Registry Management")
@ApiOAuth2(["controlplane_admin", "controlplane_dataplane"])
export class RegistryClientController {
  constructor(
    private readonly registryClientService: RegistryClientService,
    private readonly registryService: RegistryService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request catalogs",
    description: "Requests all available catalogs.",
  })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiForbiddenResponseDefault()
  async requestCatalogs(): Promise<CatalogDto[]> {
    return await this.registryClientService.requestCatalogs();
  }

  @Get("addresses")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request addresses",
    description: "Requests all available credential addresses.",
  })
  @ApiOkResponse({ type: [CredentialAddressDto] })
  @ApiForbiddenResponseDefault()
  async requestAddresses(): Promise<CredentialAddress[]> {
    return await this.registryClientService.requestAddresses();
  }

  @Get("catalogs")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get catalogs",
    description: "Fetches all catalogs from the registry.",
  })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiForbiddenResponseDefault()
  async getCatalogs(): Promise<CatalogDto[]> {
    this.logger.log(`Received request for all catalogs.`);
    return await this.registryService.getAllCatalogs();
  }
}
