import {
  Body,
  Controller,
  HttpStatus,
  Logger,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  CatalogDto,
  CatalogRequestMessage,
  CatalogRequestMessageDto,
  CatalogRequestMessageSchema,
  CatalogSchema,
  DatasetDto,
  DatasetSchema
} from "@tsg-dsp/common-dsp";
import { VerifiablePresentationGuard } from "../../auth/verifiablePresentation.guard.js";
import { DeserializePipe } from "../../utils/deserialize.pipe.js";
import { CatalogService } from "./catalog.service.js";
import {
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody
} from "@nestjs/swagger";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import { UsePagination } from "../../utils/pagination/pagination.interceptor.decorator.js";
import { PaginationQuery } from "../../utils/pagination/pagination.query.decorator.js";
import { PaginationOptionsDto } from "../../utils/pagination/pagination.options.dto.js";
import { Paginated } from "../../utils/pagination/pagination.parameters.js";

@UseGuards(VerifiablePresentationGuard)
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
  async getDataset(@Param("id") id: string): Promise<DatasetDto> {
    this.logger.log(`Received dataset request for id ${id}`);
    const result = (await this.catalogService.getDataset(id)).serialize();
    return result;
  }
}
