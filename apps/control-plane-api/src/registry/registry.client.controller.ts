import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards
} from "@nestjs/common";
import { CatalogDto, CatalogSchema } from "@tsg-dsp/common-dsp";
import { DIDDocumentDto } from "@tsg-dsp/common-dtos";
import { DIDDocument } from "did-resolver";
import { RegistryClientService } from "./registry.client.service.js";
import { RegistryService } from "./registry.service.js";
import {
  ApiOAuth2,
  ApiOperation,
  ApiTags,
  ApiOkResponse
} from "@nestjs/swagger";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import {
  OAuthGuard,
  Roles,
  UsePagination,
  PaginationQuery,
  PaginationOptionsDto,
  Paginated
} from "@tsg-dsp/common-api";

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
    description: "Requests all available catalogs."
  })
  @ApiOkResponse({ type: [CatalogSchema] })
  @ApiForbiddenResponseDefault()
  async requestCatalogs(): Promise<CatalogDto[]> {
    return await this.registryClientService.requestCatalogs();
  }

  @Get("addresses")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request addresses",
    description: "Requests all available credential addresses."
  })
  @ApiOkResponse({ type: [CredentialAddress] })
  @ApiForbiddenResponseDefault()
  async requestAddresses(): Promise<CredentialAddress[]> {
    return await this.registryClientService.requestAddresses();
  }

  @Get("didDocuments")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request DID Documents",
    description:
      "Requests all DID Documents that could be retrieved at the Wallet this Control Plane is linked to."
  })
  @ApiOkResponse({ type: DIDDocumentDto })
  @ApiForbiddenResponseDefault()
  async requestDIDDocuments(): Promise<DIDDocument[]> {
    return await this.registryService.fetchDidDocuments();
  }

  @Get("catalogs")
  @UsePagination()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get catalogs",
    description: "Fetches all catalogs from the registry."
  })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiForbiddenResponseDefault()
  async getCatalogs(
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<CatalogDto[]>> {
    this.logger.log(`Received request for all catalogs.`);
    return await this.registryService.getAllCatalogs(paginationOptions);
  }
}
