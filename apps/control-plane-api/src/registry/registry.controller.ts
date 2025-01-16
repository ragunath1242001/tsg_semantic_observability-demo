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
import { RegistryService } from "./registry.service.js";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import {
  OAuthGuard,
  Roles,
  UsePagination,
  PaginationQuery,
  PaginationOptionsDto,
  Paginated
} from "@tsg-dsp/common-api";

@ApiTags("Registry")
@ApiBearerAuth()
@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
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
