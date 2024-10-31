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
import { DataPlaneService } from "./dataPlane.service";
import { IDataPlaneDto } from "@tsg-dsp/control-plane-dtos";
import { OAuthGuard } from "../auth/oauth.guard";
import { Roles } from "../auth/roles.guard";
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
import { DataPlaneDto } from "./dataplane.schemas.js";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/dataplanes")
@ApiTags("Data Plane Management")
@ApiOAuth2(["controlplane_admin", "controlplane_dataplane"])
export class DataplaneManagementController {
  constructor(private readonly dataplaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get all dataplanes",
    description: "Fetches all the dataplanes."
  })
  @ApiOkResponse({ type: [DataPlaneDto] })
  @ApiForbiddenResponseDefault()
  async getDataPlanes(): Promise<IDataPlaneDto[]> {
    this.logger.log("Received call to fetch all dataplanes.");
    const dataPlanes = await this.dataplaneService.getDataPlanes();
    const dataPlanesDtosPromise = Promise.all(
      dataPlanes.map(async (dataplane) => {
        return {
          ...dataplane,
          datasets: dataplane.datasets
            ? await Promise.all(dataplane.datasets.map((d) => d.serialize()))
            : undefined
        };
      })
    );
    return dataPlanesDtosPromise;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Add a dataplane",
    description: "Adds a new dataplane."
  })
  @ApiBody({ type: DataPlaneDto })
  @ApiCreatedResponse({ type: DataPlaneDto })
  @ApiBadRequestResponse({ description: "Invalid dataplane data" })
  @ApiForbiddenResponseDefault()
  async addDataplane(@Body() dataplane: IDataPlaneDto): Promise<IDataPlaneDto> {
    this.logger.log("Received call to add dataplane.");
    this.logger.log(dataplane);
    return await this.dataplaneService.addDataPlane(dataplane);
  }

  @Put(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update a dataplane",
    description: "Updates an existing dataplane."
  })
  @ApiOkResponse({ type: DataPlaneDto })
  @ApiBadRequestResponse({ description: "Invalid dataplane data" })
  @ApiForbiddenResponseDefault()
  async updateDataplane(
    @Param("id") id: string,
    @Body() dataplane: DataPlaneDto
  ): Promise<IDataPlaneDto> {
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
