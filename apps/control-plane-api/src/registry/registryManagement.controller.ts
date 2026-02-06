import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  Paginated,
  PaginationOptionsDto,
  PaginationQuery,
  Requires,
  UsePagination
} from "@tsg-dsp/common-api";
import { CatalogDto, CatalogSchema } from "@tsg-dsp/common-dsp";
import {
  Action,
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault,
  DIDDocumentDto,
  Resource
} from "@tsg-dsp/common-dtos";
import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import { DIDDocument } from "did-resolver";

import { RegistryClientService } from "./registry.client.service.js";
import { RegistryService } from "./registry.service.js";

@Controller("management/registry")
@ApiTags("Registry Management")
export class RegistryManagementController {
  constructor(
    private readonly registryClientService: RegistryClientService,
    private readonly registryService: RegistryService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("")
  @Requires(Action.READ, Resource.CP_REGISTRY)
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
  @Requires(Action.READ, Resource.CP_REGISTRY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request addresses",
    description: "Requests all available credential addresses."
  })
  @ApiOkResponse({ type: [CredentialAddress] })
  @ApiForbiddenResponseDefault()
  async requestAddresses(): Promise<CredentialAddress[]> {
    return await this.registryService.fetchAddresses();
  }

  @Get("didDocuments")
  @Requires(Action.READ, Resource.CP_REGISTRY)
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
  @Requires(Action.READ, Resource.CP_REGISTRY)
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

  @Get("catalogs/:participantId")
  @Requires(Action.READ, Resource.CP_REGISTRY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get catalog by participant ID",
    description: "Fetches a specific catalog by its participant ID."
  })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiForbiddenResponseDefault()
  @ApiNotFoundResponseDefault()
  async getCatalogByParticipantId(
    @Param("participantId") participantId: string
  ): Promise<CatalogDto> {
    this.logger.log(
      `Received request for catalog with participant ID: ${participantId}`
    );
    return await this.registryService.getCatalogByParticipantId(participantId);
  }

  @Post("refresh")
  @Requires(Action.EXECUTE, Resource.CP_REGISTRY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh registry",
    description:
      "Force refresh the registry by re-crawling all participant addresses and catalogs."
  })
  @ApiOkResponse({
    description: "Registry refresh initiated successfully"
  })
  @ApiForbiddenResponseDefault()
  async refreshRegistry(): Promise<{ message: string }> {
    this.logger.log("Received request to refresh registry");
    await this.registryService.crawl();
    return { message: "Registry refresh completed successfully" };
  }
}
