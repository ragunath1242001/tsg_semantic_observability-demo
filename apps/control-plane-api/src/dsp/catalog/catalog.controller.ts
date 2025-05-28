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
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

import { DeserializePipe } from "../../utils/deserialize.pipe.js";
import { VerifiablePresentationGuard } from "../../vc-auth/verifiablePresentation.guard.js";
import { CatalogService } from "./catalog.service.js";

@UseGuards(VerifiablePresentationGuard)
@DisableOAuthGuard()
@Controller("catalog")
@ApiTags("Catalog")
@ApiBearerAuth()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}
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
    body: CatalogRequestMessage
  ): Promise<Paginated<CatalogDto>> {
    this.logger.log(`Received catalog request`);
    return await this.catalogService.request(body, paginationOptions);
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
    @Param("id") id: string
  ): Promise<DatasetDto | CatalogErrorDto> {
    this.logger.log(`Received dataset request for id ${id}`);
    return await this.catalogService.getDatasetDto(id);
  }
}
