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
  UseGuards,
} from "@nestjs/common";
import { DataPlaneService } from "./dataPlane.service";
import { DataPlaneDto } from "@libs/control-plane-dtos";
import { OAuthGuard } from "../auth/oauth.guard";
import { Roles } from "../auth/roles.guard";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("management/dataplanes")
export class DataplaneManagementController {
  constructor(private readonly dataplaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @HttpCode(HttpStatus.OK)
  async getDataPlanes(): Promise<DataPlaneDto[]> {
    this.logger.log("Received call to fetch all dataplanes.");
    const dataPlanes = await this.dataplaneService.getDataPlanes();
    const dataPlanesDtosPromise = Promise.all(
      dataPlanes.map(async (dataplane) => {
        return {
          ...dataplane,
          datasets: dataplane.datasets
            ? await Promise.all(dataplane.datasets.map((d) => d.serialize()))
            : undefined,
        };
      })
    );
    dataPlanesDtosPromise;
    return dataPlanesDtosPromise;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addDataplane(@Body() dataplane: DataPlaneDto): Promise<DataPlaneDto> {
    this.logger.log("Received call to add dataplane.");
    this.logger.log(dataplane);
    return await this.dataplaneService.addDataPlane(dataplane);
  }

  @Put(":id")
  @HttpCode(HttpStatus.OK)
  async updateDataplane(
    @Body() dataplane: DataPlaneDto
  ): Promise<DataPlaneDto> {
    this.logger.log("Received call to update dataplane");
    return await this.dataplaneService.updateDataPlane(dataplane);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.ACCEPTED)
  async deleteDataPlane(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting dataplane ${id}`);
    return await this.dataplaneService.deleteDataplane(id);
  }
}
