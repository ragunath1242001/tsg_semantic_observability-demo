import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { Requires } from "@tsg-dsp/common-api";
import {
  Catalog,
  CatalogSchema,
  DataPlaneCreation,
  DataPlaneDetailsDto,
  Dataset,
  DatasetSchema
} from "@tsg-dsp/common-dsp";
import {
  Action,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { DeserializePipe } from "../utils/deserialize.pipe.js";
import { DSPError } from "../utils/errors/error.js";
import { DataPlaneService } from "./dataPlane.service.js";

@Controller("data-plane")
@ApiTags("Data Plane")
export class DataPlaneController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly dataPlaneService: DataPlaneService) {}

  @Post("/init")
  @HttpCode(HttpStatus.OK)
  @Requires(Action.CREATE, Resource.CP_DATAPLANE)
  @ApiOperation({
    summary: "Initialize data plane",
    description: "Initializes a new data plane with the provided details."
  })
  @ApiBody({ type: DataPlaneCreation })
  @ApiOkResponse({ type: DataPlaneDetailsDto })
  @ApiBadRequestResponse({ description: "Invalid data plane details provided" })
  @ApiForbiddenResponseDefault()
  async init(
    @Body() dataPlaneDetails: DataPlaneCreation
  ): Promise<DataPlaneDetailsDto> {
    this.logger.log(
      `Received init from data plane: ${JSON.stringify(dataPlaneDetails)}`
    );
    return this.dataPlaneService.addDataPlane(dataPlaneDetails);
  }

  @Post("/:id/update")
  @HttpCode(HttpStatus.OK)
  @Requires(Action.UPDATE, Resource.CP_DATAPLANE)
  @ApiOperation({
    summary: "Update data plane",
    description: "Updates the details of an existing data plane."
  })
  @ApiBody({ type: DataPlaneDetailsDto })
  @ApiOkResponse({ type: DataPlaneDetailsDto })
  @ApiBadRequestResponse({ description: "Identifier mismatch or invalid data" })
  @ApiForbiddenResponseDefault()
  async update(
    @Param("id") id: string,
    @Body() dataPlaneDetails: DataPlaneDetailsDto
  ): Promise<DataPlaneDetailsDto> {
    this.logger.log(
      `Received update from data plane ${id}: ${JSON.stringify(
        dataPlaneDetails
      )}`
    );
    if (id !== dataPlaneDetails.id) {
      throw new DSPError(
        "Identifier in path and in body do not match",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }
    return await this.dataPlaneService.updateDataPlane(id, dataPlaneDetails);
  }

  @Post("/:id/catalog")
  @HttpCode(HttpStatus.OK)
  @Requires(Action.UPDATE, Resource.CP_CATALOG)
  @ApiOperation({
    summary: "Update catalog",
    description: "Updates the catalog for the specified data plane."
  })
  @ApiBody({ type: CatalogSchema })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiBadRequestResponse({ description: "Invalid catalog data" })
  @ApiForbiddenResponseDefault()
  async updateCatalog(
    @Param("id") id: string,
    @Body(new DeserializePipe(Catalog)) catalog: Catalog
  ): Promise<Catalog> {
    this.logger.log(`Received catalog update from data plane ${id}`);
    const catalogUpdate = await this.dataPlaneService.updateCatalog(
      id,
      catalog
    );
    return catalogUpdate;
  }

  @Post("/:id/dataset")
  @HttpCode(HttpStatus.OK)
  @Requires(Action.CREATE, Resource.CP_DATASET)
  @ApiOperation({
    summary: "Add dataset",
    description: "Adds a new dataset to the specified data plane."
  })
  @ApiBody({ description: "Dataset details", type: DatasetSchema })
  @ApiOkResponse({ description: "Dataset added successfully" })
  @ApiBadRequestResponse({ description: "Invalid dataset details provided" })
  @ApiForbiddenResponseDefault()
  async addDataset(
    @Param("id") id: string,
    @Body(new DeserializePipe(Dataset)) dataset: Dataset
  ): Promise<void> {
    this.logger.log(
      `Received new dataset for data plane ${id}: ${JSON.stringify(dataset)}`
    );
    await this.dataPlaneService.addDataset(id, dataset);
  }

  @Put("/:id/dataset/:datasetId")
  @HttpCode(HttpStatus.OK)
  @Requires(Action.UPDATE, Resource.CP_DATASET)
  @ApiOperation({
    summary: "Update dataset",
    description: "Updates an existing dataset for the specified data plane."
  })
  @ApiBody({ description: "Updated dataset details", type: DatasetSchema })
  @ApiOkResponse({ description: "Dataset updated successfully" })
  @ApiBadRequestResponse({
    description: "Identifier mismatch or invalid dataset data"
  })
  @ApiForbiddenResponseDefault()
  async updateDataset(
    @Param("id") id: string,
    @Param("datasetId") datasetId: string,
    @Body(new DeserializePipe(Dataset)) dataset: Dataset
  ): Promise<void> {
    this.logger.log(
      `Received dataset update for data plane ${id}, dataset ${datasetId}: ${JSON.stringify(dataset)}`
    );
    if (datasetId !== dataset.id) {
      throw new DSPError(
        "Identifier in path and in body do not match",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }
    await this.dataPlaneService.updateDataset(id, datasetId, dataset);
  }

  @Delete("/:id/dataset/:datasetId")
  @HttpCode(HttpStatus.OK)
  @Requires(Action.DELETE, Resource.CP_DATASET)
  @ApiOperation({
    summary: "Delete dataset",
    description: "Deletes a dataset from the specified data plane."
  })
  @ApiOkResponse({ description: "Dataset deleted successfully" })
  @ApiBadRequestResponse({ description: "Invalid dataset identifier" })
  @ApiForbiddenResponseDefault()
  async deleteDataset(
    @Param("id") id: string,
    @Param("datasetId") datasetId: string
  ): Promise<void> {
    this.logger.log(
      `Received dataset deletion for data plane ${id}, dataset ${datasetId}`
    );
    await this.dataPlaneService.deleteDataset(id, datasetId);
  }
}
