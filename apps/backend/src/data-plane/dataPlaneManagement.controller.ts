import { Controller, Get, HttpCode, HttpStatus, Logger, UseGuards } from "@nestjs/common";
import { ManagementGuard } from "../auth/management.guard";
import { DataPlaneService } from "./dataPlane.service";import { DataPlaneDto } from "@libs/dtos";



@UseGuards(ManagementGuard)
@Controller('management/dataplanes')
export class DataplaneManagementController {
  constructor(private readonly dataplaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @HttpCode(HttpStatus.OK)
  async getDataPlanes(): Promise<DataPlaneDto[]> {
    this.logger.log("Received call to fetch all dataplanes.");
    const dataPlanes = await this.dataplaneService.getDataPlanes()
    const dataPlanesDtosPromise = Promise.all(dataPlanes.map(async (dataplane) => {
      return {
        ...dataplane,
        dataset: await dataplane.dataset?.serialize()
      }
    }))
    return dataPlanesDtosPromise
  }

}