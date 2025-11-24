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
  Query
} from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { nonEmptyStringPipe, Roles } from "@tsg-dsp/common-api";
import { CatalogClientService } from "@tsg-dsp/common-data-plane-api";
import { CatalogDto, CatalogSchema, DatasetDto } from "@tsg-dsp/common-dsp";
import {
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault,
  DataPlaneStateDto
} from "@tsg-dsp/common-dtos";

import { DataPlaneService } from "./dataplane.service.js";

@ApiTags("Data Plane Management")
@ApiOAuth2(["controlplane_dataplane"])
@Controller("/management")
@Roles("controlplane_dataplane")
export class DataPlaneManagementController {
  constructor(
    private readonly dataPlaneService: DataPlaneService,
    private readonly catalog: CatalogClientService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/state")
  @ApiOperation({
    summary: "Get Data Plane state",
    description:
      "Get the state of the data plane, consisting of the id, details and the dataset."
  })
  @ApiOkResponse({ type: DataPlaneStateDto })
  @ApiForbiddenResponseDefault()
  async getState(): Promise<DataPlaneStateDto> {
    return await this.dataPlaneService.getStateDto();
  }

  @Get("/catalog")
  @ApiOperation({
    summary: "Get catalog",
    description: "Get the current catalog from the Control Plane."
  })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiForbiddenResponseDefault()
  async getCatalog(): Promise<CatalogDto> {
    return await this.catalog.getOwnCatalog();
  }

  @Get("/registry/addresses")
  @ApiOperation({
    summary: "Get registry addresses",
    description:
      "Get all participant addresses from the Control Plane registry."
  })
  @ApiOkResponse({ type: [Object] })
  @ApiForbiddenResponseDefault()
  async getRegistryAddresses(): Promise<{ didId: string; address: string }[]> {
    return await this.catalog.getRegistryAddresses();
  }

  @Get("/registry/catalog/:participantId")
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
    return await this.catalog.getParticipantCatalog(participantId);
  }

  @Get("/participant-id")
  @ApiOperation({
    summary: "Get current participant ID",
    description:
      "Get the ID of the current participant from the Control Plane catalog."
  })
  @ApiOkResponse({ type: String })
  @ApiForbiddenResponseDefault()
  async getParticipantId(): Promise<string> {
    return await this.catalog.getParticipantId();
  }

  @Post("/refresh")
  @ApiOperation({
    summary: "(Re)register data plane",
    description:
      "Use this endpoint to (re)register your data plane. Currently it will register with defaults from the config."
  })
  @ApiResponse({ status: HttpStatus.ACCEPTED })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.ACCEPTED)
  async refreshRegistration() {
    return await this.dataPlaneService.registerDataplane();
  }

  @Get("/dataset")
  @ApiOperation({
    summary: "Get dataset",
    description: "Get the current dataset configuration."
  })
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async getDatasetConfig(): Promise<DatasetDto[]> {
    return await this.dataPlaneService.getDatasets();
  }

  @Put("/dataset")
  @ApiOperation({
    summary: "Update dataset",
    description: "Update an existing dataset by id."
  })
  @ApiBody({})
  @ApiQuery({ name: "datasetId", required: true, description: "Dataset ID" })
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async updateDatasetConfig(
    @Body()
    updatedDataset: DatasetDto,
    @Query("datasetId", nonEmptyStringPipe)
    datasetId: string
  ) {
    return await this.dataPlaneService.updateDataset(datasetId, updatedDataset);
  }

  @Post("/dataset")
  @ApiOperation({
    summary: "Add dataset",
    description: "Add a new dataset."
  })
  @ApiBody({})
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async addDataset(@Body() dataset: DatasetDto) {
    return await this.dataPlaneService.addDataset(dataset);
  }

  @Delete("/dataset")
  @ApiOperation({
    summary: "Delete dataset",
    description: "Delete an existing dataset by id."
  })
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  async deleteDataset(
    @Query("datasetId", nonEmptyStringPipe) datasetId: string
  ) {
    return await this.dataPlaneService.deleteDataset(datasetId);
  }
}
