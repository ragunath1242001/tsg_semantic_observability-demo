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
  Put
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  Paginated,
  PaginationOptionsDto,
  PaginationQuery,
  Roles,
  UsePagination
} from "@tsg-dsp/common-api";
import {
  DataPlaneDetailsDto,
  DatasetDto,
  DatasetSchema
} from "@tsg-dsp/common-dsp";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

import { DataPlaneService } from "./dataPlane.service.js";

@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/dataplanes")
@ApiTags("Data Plane Management")
@ApiOAuth2(["controlplane_admin", "controlplane_dataplane"])
export class DataplaneManagementController {
  constructor(private readonly dataplaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @Roles(["controlplane_admin", "controlplane_dataplane", "readonly_user"])
  @UsePagination()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get all dataplanes",
    description: "Fetches all the dataplanes."
  })
  @ApiOkResponse({ type: [DataPlaneDetailsDto] })
  @ApiForbiddenResponseDefault()
  async getDataPlanes(
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<DataPlaneDetailsDto[]>> {
    this.logger.log("Received call to fetch all dataplanes.");
    return await this.dataplaneService.getDataPlanes(paginationOptions);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Add a dataplane",
    description: "Adds a new dataplane."
  })
  @ApiBody({ type: DataPlaneDetailsDto })
  @ApiCreatedResponse({ type: DataPlaneDetailsDto })
  @ApiBadRequestResponse({ description: "Invalid dataplane data" })
  @ApiForbiddenResponseDefault()
  async addDataplane(
    @Body() dataplane: DataPlaneDetailsDto
  ): Promise<DataPlaneDetailsDto> {
    this.logger.log("Received call to add dataplane.");
    this.logger.log(dataplane);
    return await this.dataplaneService.addDataPlane(dataplane);
  }

  @Put(":id")
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: DataPlaneDetailsDto })
  @ApiOperation({
    summary: "Update a dataplane",
    description: "Updates an existing dataplane."
  })
  @ApiOkResponse({ type: DataPlaneDetailsDto })
  @ApiBadRequestResponse({ description: "Invalid dataplane data" })
  @ApiForbiddenResponseDefault()
  async updateDataplane(
    @Param("id") id: string,
    @Body() dataplane: DataPlaneDetailsDto
  ): Promise<DataPlaneDetailsDto> {
    this.logger.log("Received call to update dataplane");
    return await this.dataplaneService.updateDataPlane(id, dataplane);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Delete a dataplane",
    description: "Deletes a dataplane by ID."
  })
  @ApiAcceptedResponse({ description: "Dataplane deleted successfully" })
  @ApiBadRequestResponse({ description: "Invalid dataplane ID" })
  @ApiForbiddenResponseDefault()
  async deleteDataPlane(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting dataplane ${id}`);
    return await this.dataplaneService.deleteDataplane(id);
  }

  @Get(":id/datasets")
  @UsePagination()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get all datasets for a dataplane",
    description: "Fetches all datasets associated with a specific dataplane."
  })
  @ApiOkResponse({ type: [DatasetSchema] })
  @ApiForbiddenResponseDefault()
  async getDatasets(
    @Param("id") id: string,
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<DatasetDto[]>> {
    this.logger.log(`Received call to fetch datasets for dataplane ${id}`);
    return await this.dataplaneService.getDatasets(id, paginationOptions);
  }
}
