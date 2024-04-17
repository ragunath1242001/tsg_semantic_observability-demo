import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { DataPlaneCreation, DataPlaneDto } from "@libs/dtos";
import { DataPlaneService } from "./dataPlane.service";
import { DeserializePipe } from "../utils/deserialize.pipe";
import { Dataset } from "../model/dsp/catalog/catalog";
import { DSPError } from "../utils/errors/error";
import { OAuthGuard } from "../auth/oauth.guard";
import { Roles } from "../auth/roles.guard";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("data-plane")
export class DataPlaneController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly dataPlaneService: DataPlaneService) {}

  @Post("/init")
  @HttpCode(HttpStatus.OK)
  async init(
    @Body() dataPlaneDetails: DataPlaneCreation
  ): Promise<DataPlaneDto> {
    this.logger.log(
      `Received init from data plane: ${JSON.stringify(dataPlaneDetails)}`
    );
    return this.dataPlaneService.addDataPlane(dataPlaneDetails);
  }

  @Post("/:id/update")
  @HttpCode(HttpStatus.OK)
  async update(
    @Param("id") id: string,
    @Body() dataPlaneDetails: DataPlaneDto
  ): Promise<DataPlaneDto> {
    this.logger.log(
      `Received update from data plane ${id}: ${JSON.stringify(
        dataPlaneDetails
      )}`
    );
    if (id !== dataPlaneDetails.identifier) {
      throw new DSPError(
        "Identifier in path and in body do not match",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }
    const dataPlane = await this.dataPlaneService.updateDataPlane(
      dataPlaneDetails
    );
    return {
      ...dataPlane,
      dataset: await dataPlane.dataset?.serialize(),
    };
  }

  @Post("/:id/catalog")
  @HttpCode(HttpStatus.OK)
  async updateCatalog(
    @Param("id") id: string,
    @Body(new DeserializePipe(Dataset)) dataset: Dataset
  ): Promise<Dataset> {
    this.logger.log(`Received catalog update from data plane ${id}`);
    const datasetUpdate = await this.dataPlaneService.updateCatalog(
      id,
      dataset
    );
    return datasetUpdate;
  }
}
