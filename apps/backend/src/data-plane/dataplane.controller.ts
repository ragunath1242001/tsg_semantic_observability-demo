import { DataPlaneCreation, DataPlaneDto } from "@libs/dtos";
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
import { Catalog } from "@tsg-dsp/common";
import { OAuthGuard } from "../auth/oauth.guard";
import { Roles } from "../auth/roles.guard";
import { DeserializePipe } from "../utils/deserialize.pipe";
import { DSPError } from "../utils/errors/error";
import { DataPlaneService } from "./dataPlane.service";

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
      datasets: dataPlane.datasets
        ? await Promise.all(
            dataPlane.datasets.map(async (d) => await d.serialize())
          )
        : undefined,
    };
  }

  @Post("/:id/catalog")
  @HttpCode(HttpStatus.OK)
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
}
