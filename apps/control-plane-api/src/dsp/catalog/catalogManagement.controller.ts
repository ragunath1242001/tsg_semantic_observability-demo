import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  CatalogDto,
  CatalogRequestMessage,
  CatalogSchema,
  Dataset,
  DatasetDto,
  DatasetSchema
} from "@tsg-dsp/common-dsp";
import { OAuthGuard } from "../../auth/oauth.guard.js";
import { Roles } from "../../auth/roles.guard.js";
import { normalizeAddress } from "../../utils/address.js";
import { DeserializePipe } from "../../utils/deserialize.pipe.js";
import { DspClientService } from "../client/client.service.js";
import { CatalogService } from "./catalog.service.js";
import {
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiAcceptedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam
} from "@nestjs/swagger";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import { PaginationQuery } from "../../utils/pagination/pagination.query.decorator.js";
import { UsePagination } from "../../utils/pagination/pagination.interceptor.decorator.js";
import { PaginationOptionsDto } from "../../utils/pagination/pagination.options.dto.js";
import { Paginated } from "../../utils/pagination/pagination.parameters.js";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/catalog")
@ApiTags("Catalog Management")
@ApiBearerAuth()
export class CatalogManagementController {
  constructor(
    private readonly dsp: DspClientService,
    private readonly catalogService: CatalogService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("request")
  @HttpCode(HttpStatus.OK)
  @UsePagination()
  @ApiOperation({
    summary: "Request catalog",
    description: "Requests a catalog from a remote or local connector."
  })
  @ApiQuery({
    name: "address",
    required: false,
    description: "The address of the remote connector"
  })
  @ApiQuery({
    name: "audience",
    required: false,
    description: "The audience for the request"
  })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  @ApiForbiddenResponseDefault()
  async requestCatalog(
    @PaginationQuery() paginationOptions: PaginationOptionsDto,
    @Query("address") address?: string,
    @Query("audience") audience?: string
  ): Promise<Paginated<CatalogDto>> {
    if (address) {
      this.logger.log(
        `Received catalog request for remote connector at ${address}`
      );
      return {
        data: await this.dsp.requestCatalog(
          normalizeAddress(address, 0, "catalog", "request"),
          audience
        ),
        total: -1
      };
    } else {
      this.logger.log(`Received catalog request for local connector`);
      return await this.catalogService.request(
        new CatalogRequestMessage({}),
        paginationOptions
      );
    }
  }

  @Get("dataset")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request dataset",
    description: "Requests a dataset from a remote or local connector by ID."
  })
  @ApiQuery({
    name: "address",
    required: false,
    description: "The address of the remote connector"
  })
  @ApiQuery({
    name: "id",
    required: true,
    description: "The ID of the dataset"
  })
  @ApiQuery({
    name: "audience",
    required: false,
    description: "The audience for the request"
  })
  @ApiOkResponse({ type: DatasetSchema })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  @ApiForbiddenResponseDefault()
  async requestDataset(
    @Query("address") address: string,
    @Query("id") id: string,
    @Query("audience") audience?: string
  ): Promise<DatasetDto> {
    if (address) {
      this.logger.log(
        `Received dataset request for remote connector at ${address} with id ${id}`
      );
      return this.dsp.requestDataset(
        normalizeAddress(address, 0, "catalog", "datasets"),
        id,
        audience
      );
    } else {
      this.logger.log(
        `Received dataset request for local connector with id ${id}`
      );
      return (await this.catalogService.getDataset(id))?.serialize();
    }
  }

  @Post("dataset")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Add dataset",
    description: "Adds a new dataset to the catalog."
  })
  @ApiBody({ type: DatasetSchema })
  @ApiCreatedResponse({ type: DatasetSchema })
  @ApiBadRequestResponse({ description: "Invalid dataset data" })
  @ApiForbiddenResponseDefault()
  async addDataset(
    @Body(new DeserializePipe(Dataset)) dataset: Dataset
  ): Promise<DatasetDto> {
    const datasetdao = await this.catalogService.addDataset(dataset);
    return new Dataset(datasetdao).serialize();
  }

  @Put("dataset/:id")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Update dataset",
    description: "Updates an existing dataset in the catalog."
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "The ID of the dataset to update"
  })
  @ApiBody({ type: DatasetSchema })
  @ApiAcceptedResponse({ type: DatasetSchema })
  @ApiBadRequestResponse({ description: "Invalid dataset data" })
  @ApiForbiddenResponseDefault()
  async updateDataset(
    @Param("id") id: string,
    @Body(new DeserializePipe(Dataset)) dataset: Dataset
  ): Promise<DatasetDto> {
    const datasetdao = await this.catalogService.updateDataset(
      dataset.id,
      dataset
    );
    return new Dataset(datasetdao).serialize();
  }

  @Delete("dataset/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete dataset",
    description: "Deletes a dataset from the catalog by ID."
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "The ID of the dataset to delete"
  })
  @ApiNoContentResponse({ description: "Dataset deleted successfully" })
  @ApiBadRequestResponse({ description: "Invalid dataset ID" })
  @ApiForbiddenResponseDefault()
  async deleteDataset(@Param("id") id: string): Promise<void> {
    await this.catalogService.removeDataset(id);
  }
}
