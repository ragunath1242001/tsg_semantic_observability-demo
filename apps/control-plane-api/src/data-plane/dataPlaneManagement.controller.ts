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
  UseGuards
} from "@nestjs/common";
import { DataPlaneService } from "./dataPlane.service.js";
import { OAuthGuard } from "../auth/oauth.guard.js";
import { Roles } from "../auth/roles.guard.js";
import {
  ApiOAuth2,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody
} from "@nestjs/swagger";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import { UsePagination } from "../utils/pagination/pagination.interceptor.decorator.js";
import { PaginationQuery } from "../utils/pagination/pagination.query.decorator.js";
import { PaginationOptionsDto } from "../utils/pagination/pagination.options.dto.js";
import { Paginated } from "../utils/pagination/pagination.parameters.js";
import { DataPlaneDetailsDto } from "@tsg-dsp/common-dsp";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/dataplanes")
@ApiTags("Data Plane Management")
@ApiOAuth2(["controlplane_admin", "controlplane_dataplane"])
export class DataplaneManagementController {
  constructor(private readonly dataplaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
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
    return await this.dataplaneService.updateDataPlane(dataplane);
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
}
