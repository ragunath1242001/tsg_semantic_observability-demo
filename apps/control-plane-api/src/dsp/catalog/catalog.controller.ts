import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  DisableOAuthGuard,
  Paginated,
  PaginationOptionsDto,
  PaginationQuery,
  ProtocolAuditService,
  UsePagination
} from "@tsg-dsp/common-api";
import {
  CatalogDto,
  CatalogErrorDto,
  CatalogRequestMessage,
  CatalogRequestMessageSchema,
  CatalogSchema,
  DatasetDto,
  DatasetSchema
} from "@tsg-dsp/common-dsp";
import {
  Action,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { DeserializePipe } from "../../utils/deserialize.pipe.js";
import { VerifiablePresentationGuard } from "../../vc-auth/verifiablePresentation.guard.js";
import { VPId } from "../../vc-auth/vp.decorators.js";
import { CatalogService } from "./catalog.service.js";

@UseGuards(VerifiablePresentationGuard)
@DisableOAuthGuard()
@Controller("catalog")
@ApiTags("Catalog")
@ApiBearerAuth()
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly protocolAuditService: ProtocolAuditService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Post("request")
  @UsePagination()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request catalog",
    description: "Requests a catalog with the provided details."
  })
  @ApiBody({ type: CatalogRequestMessageSchema })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiBadRequestResponse({ description: "Invalid catalog request data" })
  @ApiForbiddenResponseDefault()
  async request(
    @PaginationQuery() paginationOptions: PaginationOptionsDto,
    @Body(new DeserializePipe(CatalogRequestMessage))
    body: CatalogRequestMessage,
    @VPId() vpId: string
  ): Promise<Paginated<CatalogDto>> {
    this.logger.log(`Received catalog request`);
    const result = await this.catalogService.request(body, paginationOptions);
    await this.protocolAuditService.logAllowed({
      caller: this.protocolAuditService.createPeerServiceActor(
        vpId,
        "remote-control-plane"
      ),
      action: Action.READ,
      resource: { type: Resource.CP_CATALOG }
    });
    return result;
  }

  @Get("datasets/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get dataset",
    description: "Fetches a dataset by ID."
  })
  @ApiOkResponse({ type: DatasetSchema })
  @ApiBadRequestResponse({ description: "Invalid dataset ID" })
  @ApiForbiddenResponseDefault()
  async getDataset(
    @Param("id") id: string,
    @VPId() vpId: string
  ): Promise<DatasetDto | CatalogErrorDto> {
    this.logger.log(`Received dataset request for id ${id}`);
    const result = await this.catalogService.getDatasetDto(id);
    await this.protocolAuditService.logAllowed({
      caller: this.protocolAuditService.createPeerServiceActor(
        vpId,
        "remote-control-plane"
      ),
      action: Action.READ,
      resource: { type: Resource.CP_DATASET, id }
    });
    return result;
  }
}
