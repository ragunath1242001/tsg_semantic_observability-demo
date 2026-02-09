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
  Res
} from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import {
  nonEmptyStringPipe,
  Requires,
  validateOrRejectSync,
  validationPipe
} from "@tsg-dsp/common-api";
import { CatalogClientService } from "@tsg-dsp/common-data-plane-api";
import { CatalogDto, CatalogSchema } from "@tsg-dsp/common-dsp";
import {
  Action,
  ApiForbiddenResponseDefault,
  DataPlaneStateDto,
  Resource
} from "@tsg-dsp/common-dtos";
import {
  DatasetConfig,
  DatasetConfigWrapper,
  DatasetItem,
  DatasetItemWithDto
} from "@tsg-dsp/http-data-plane-dtos";
import { plainToInstance } from "class-transformer";
import { Response } from "express";

import { DatasetItemDao } from "./dataplane.dao.js";
import { DataPlaneService } from "./dataplane.service.js";

@ApiTags("Data Plane Management")
@Controller("/management")
export class DataPlaneManagementController {
  constructor(
    private readonly dataPlaneService: DataPlaneService,
    private readonly catalog: CatalogClientService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/state")
  @Requires(Action.READ, Resource.HDP_DATAPLANE)
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
  @Requires(Action.READ, Resource.HDP_DATAPLANE)
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
  @Requires(Action.READ, Resource.HDP_DATAPLANE)
  @ApiOperation({
    summary: "Get registry addresses",
    description: "Get the current registry addresses from the Control Plane."
  })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: { didId: { type: "string" }, address: { type: "string" } }
      }
    }
  })
  @ApiForbiddenResponseDefault()
  async getRegistryAddresses(): Promise<{ didId: string; address: string }[]> {
    return await this.catalog.getRegistryAddresses();
  }

  @Get("/registry/catalog/:participantId")
  @Requires(Action.READ, Resource.HDP_DATAPLANE)
  @ApiOperation({
    summary: "Get participant catalog",
    description: "Get the catalog of a participant based on its participant ID."
  })
  @ApiOkResponse({ type: [CatalogSchema] })
  @ApiForbiddenResponseDefault()
  async getRegistryCatalog(
    @Param("participantId", nonEmptyStringPipe) participantId: string
  ): Promise<CatalogDto> {
    return await this.catalog.getParticipantCatalog(participantId);
  }

  @Post("/registry/refresh")
  @Requires(Action.EXECUTE, Resource.HDP_DATAPLANE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh registry",
    description:
      "Force refresh the registry by triggering a re-crawl of all participant addresses and catalogs on the Control Plane."
  })
  @ApiOkResponse({
    description: "Registry refresh initiated successfully"
  })
  @ApiForbiddenResponseDefault()
  async refreshRegistry(): Promise<{ message: string }> {
    this.logger.log("Triggering registry refresh on Control Plane");
    return await this.catalog.refreshRegistry();
  }

  @Get("/participant-id")
  @ApiOperation({
    summary: "Get current participant ID",
    description:
      "Get the ID of the current participant from the Control Plane catalog."
  })
  @ApiOkResponse({ type: String })
  @ApiForbiddenResponseDefault()
  @Requires(Action.READ, Resource.ADP_DATAPLANE)
  async getParticipantId(): Promise<string> {
    return await this.catalog.getParticipantId();
  }

  @Post("/refresh")
  @Requires(Action.EXECUTE, Resource.HDP_DATAPLANE)
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

  @Get("/openapi")
  @Requires(Action.READ, Resource.HDP_DATAPLANE)
  @ApiQuery({
    name: "url",
    type: String,
    required: true,
    description: "URL of the OpenAPI document"
  })
  @ApiOperation({
    summary: "Fetch OpenAPI document",
    description:
      "Fetch an OpenAPI document from a given URL and return it as JSON."
  })
  async fetchOpenApiDocument(
    @Query("url", nonEmptyStringPipe) url: string,
    @Res() response: Response
  ): Promise<void> {
    await this.dataPlaneService.fetchOpenApiDocument(url, response);
  }

  @Get("/config")
  @Requires(Action.READ, Resource.HDP_DATAPLANE)
  @ApiOperation({
    summary: "Get dataset",
    description: "Get the current dataset configuration."
  })
  @ApiOkResponse({ type: DatasetConfig })
  @ApiForbiddenResponseDefault()
  async getDatasetConfig(): Promise<DatasetConfig> {
    return this.dataPlaneService.getDatasetConfig();
  }

  @Put("/config")
  @Requires(Action.UPDATE, Resource.HDP_DATAPLANE)
  @ApiOperation({
    summary: "Update dataset",
    description: "Update the current dataset configuration."
  })
  @ApiBody({ type: DatasetConfig })
  @ApiOkResponse({ type: DataPlaneStateDto })
  @ApiForbiddenResponseDefault()
  async updateDatasetConfig(
    @Body()
    datasetConfig: any
  ) {
    const wrapper = validateOrRejectSync(
      plainToInstance(DatasetConfigWrapper, {
        datasetConfig: datasetConfig
      })
    );

    return await this.dataPlaneService.updateDatasetConfig(
      wrapper.datasetConfig
    );
  }

  @Get("/datasets")
  @Requires(Action.READ, Resource.HDP_DATAPLANE)
  @ApiOperation({
    summary: "Get datasets",
    description: "Retrieve all datasets."
  })
  @ApiOkResponse({ type: [DatasetItem] })
  @ApiForbiddenResponseDefault()
  async getDatasets(): Promise<DatasetItemWithDto[]> {
    return await this.dataPlaneService.getDatasetItems();
  }

  @Get("/datasets/:id")
  @Requires(Action.READ, Resource.HDP_DATAPLANE)
  @ApiOperation({
    summary: "Get dataset",
    description: "Retrieve a specific dataset by id."
  })
  @ApiOkResponse({ type: DatasetConfig })
  @ApiForbiddenResponseDefault()
  async getDataset(@Param("id") id: string): Promise<DatasetItemWithDto> {
    return await this.dataPlaneService.getDatasetItem(id);
  }

  @Post("/datasets")
  @Requires(Action.CREATE, Resource.HDP_DATAPLANE)
  @ApiOperation({
    summary: "Create dataset",
    description: "Create a new dataset."
  })
  @ApiBody({ type: DatasetItem })
  @ApiOkResponse({ type: DatasetItem })
  @ApiForbiddenResponseDefault()
  async createDataset(
    @Body(validationPipe) datasetItem: DatasetItem
  ): Promise<DatasetItemDao> {
    return await this.dataPlaneService.addDatasetItem(datasetItem);
  }

  @Put("/datasets/:id")
  @Requires(Action.UPDATE, Resource.HDP_DATAPLANE)
  @ApiOperation({
    summary: "Update dataset",
    description: "Update an existing dataset by id."
  })
  @ApiBody({ type: DatasetItem })
  @ApiOkResponse({ type: DatasetItem })
  @ApiForbiddenResponseDefault()
  async updateDataset(
    @Param("id") id: string,
    @Body(validationPipe) datasetItem: DatasetItem
  ): Promise<DatasetItemWithDto> {
    return await this.dataPlaneService.updateDatasetItem(id, datasetItem);
  }

  @Delete("/datasets/:id")
  @Requires(Action.DELETE, Resource.HDP_DATAPLANE)
  @ApiOperation({
    summary: "Delete dataset",
    description: "Delete an existing dataset by id."
  })
  @ApiOkResponse({ type: DatasetItemWithDto })
  @ApiForbiddenResponseDefault()
  async deleteDataset(@Param("id") id: string): Promise<DatasetItemWithDto> {
    return await this.dataPlaneService.removeDatasetItem(id);
  }
}
