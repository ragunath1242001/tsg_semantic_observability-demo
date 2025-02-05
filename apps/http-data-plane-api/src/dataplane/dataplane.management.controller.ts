import {
  Controller,
  Logger,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  Put,
  Delete,
  Param
} from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service.js";
import {
  DatasetConfig,
  DatasetConfigWrapper,
  DatasetItem,
  DatasetItemWithDto
} from "@tsg-dsp/http-data-plane-dtos";
import { CatalogDto, CatalogSchema } from "@tsg-dsp/common-dsp";
import {
  ApiForbiddenResponseDefault,
  DataPlaneStateDto
} from "@tsg-dsp/common-dtos";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import {
  Roles,
  validateOrRejectSync,
  validationPipe
} from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { DatasetItemDao } from "./dataplane.dao.js";

@ApiTags("Data Plane Management")
@ApiOAuth2(["controlplane_dataplane"])
@Controller("/management")
@Roles("controlplane_dataplane")
export class DataPlaneManagementController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
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
    return await this.dataPlaneService.getControlPlaneCatalog();
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

  @Get("/config")
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
