import { Controller, Get, HttpCode, HttpStatus, Logger } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import {
  Paginated,
  PaginationOptionsDto,
  PaginationQuery,
  Requires,
  UsePagination
} from "@tsg-dsp/common-api";
import { CatalogDto, CatalogSchema } from "@tsg-dsp/common-dsp";
import { Action, Resource } from "@tsg-dsp/common-dtos";
import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";

import { RegistryService } from "./registry.service.js";

@ApiTags("Registry")
@ApiBearerAuth()
@Requires(Action.READ, Resource.CP_REGISTRY)
@Controller("registry")
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @UsePagination()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all catalogs" })
  @ApiResponse({
    status: 200,
    description: "Successfully fetched all catalogs",
    type: [CatalogSchema]
  })
  async getCatalogs(
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<CatalogDto[]>> {
    this.logger.log(`Received request for all catalogs.`);
    return await this.registryService.getAllCatalogs(paginationOptions);
  }

  @Get("addresses")
  @ApiOperation({ summary: "Request all addresses" })
  @ApiResponse({
    status: 200,
    description: "Successfully fetched all addresses",
    type: [CredentialAddress]
  })
  async requestAddresses(): Promise<CredentialAddress[]> {
    return await this.registryService.fetchAddresses();
  }
}
