import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards
} from "@nestjs/common";
import { CatalogDto } from "@tsg-dsp/common-dsp";
import { RegistryService } from "./registry.service";
import { OAuthGuard } from "../auth/oauth.guard";
import { Roles } from "../auth/roles.guard";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { CredentialAddressDto } from "./registry.schema";
import { CatalogSchema } from "@tsg-dsp/common-dtos";

@ApiTags("Registry")
@ApiBearerAuth()
@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("registry")
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all catalogs" })
  @ApiResponse({
    status: 200,
    description: "Successfully fetched all catalogs",
    type: [CatalogSchema]
  })
  async getCatalogs(): Promise<CatalogDto[]> {
    this.logger.log(`Received request for all catalogs.`);
    return await this.registryService.getAllCatalogs();
  }

  @Get("addresses")
  @ApiOperation({ summary: "Request all addresses" })
  @ApiResponse({
    status: 200,
    description: "Successfully fetched all addresses",
    type: [CredentialAddressDto]
  })
  async requestAddresses(): Promise<CredentialAddress[]> {
    return await this.registryService.fetchAddresses();
  }
}
