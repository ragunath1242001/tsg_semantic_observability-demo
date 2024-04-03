import { Controller, Logger, Get, Headers } from "@nestjs/common";
import { DataPlaneService } from "./dataplane.service";
import { DataPlaneStateDto, TransferDto } from "@libs/dtos";

@Controller("/management")
export class DataPlaneManagementController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("/state")
  async getState(
    @Headers("Authorization") authorization: string,
  ): Promise<DataPlaneStateDto> {
    await this.dataPlaneService.checkManagementAuthorization(authorization);
    return await this.dataPlaneService.getState();
  }

  @Get("/transfers")
  async getTransfers(
    @Headers("Authorization") authorization: string,
  ): Promise<TransferDto[]> {
    await this.dataPlaneService.checkManagementAuthorization(authorization);
    return await this.dataPlaneService.getTransfers();
  }
}
