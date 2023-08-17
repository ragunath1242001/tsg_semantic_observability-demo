import { Body, Controller, HttpCode, HttpStatus, Logger, Param, Post } from "@nestjs/common";
import { DataPlaneCreation, DataPlaneDetailsDto } from "../../model/data-planes/dataPlanes.dto";
import { DataPlaneService } from "../../services/dataPlane.service";
import { DeserializePipe } from "../../utils/deserialize.pipe";
import { Dataset } from "../../model/dsp/catalog/catalog";
import { DSPError } from "../../utils/errors/error";

@Controller('data-plane')
export class DataPlaneController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly dataPlaneService: DataPlaneService) {}

  @Post("/init")
  @HttpCode(HttpStatus.OK)
  async init(@Body() dataPlaneDetails: DataPlaneCreation): Promise<DataPlaneDetailsDto> {
    this.logger.log(`Received init from data plane: ${JSON.stringify(dataPlaneDetails)}`)
    return this.dataPlaneService.addDataPlane(dataPlaneDetails);
  }
  
  @Post("/:id/update")
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dataPlaneDetails: DataPlaneDetailsDto): Promise<DataPlaneDetailsDto> {
    this.logger.log(`Received update from data plane ${id}: ${JSON.stringify(dataPlaneDetails)}`);
    if (id !== dataPlaneDetails.identifier) {
      throw new DSPError("Identifier in path and in body do not match", HttpStatus.BAD_REQUEST);
    }
    const dataPlane = await this.dataPlaneService.updateDataPlane(dataPlaneDetails);
    if (dataPlane === undefined) {
      throw new DSPError(`Data plane with identifier ${dataPlaneDetails.identifier} not found`, HttpStatus.NOT_FOUND);
    }
    return dataPlane;
  }

  @Post("/:id/catalog")
  @HttpCode(HttpStatus.OK)
  async updateCatalog(@Param('id') id: string, @Body(new DeserializePipe(Dataset)) dataset: Dataset): Promise<Dataset> {
    this.logger.log(`Received catalog update from data plane ${id}`);
    const datasetUpdate = await this.dataPlaneService.updateCatalog(id, dataset);
    if (datasetUpdate === undefined) {
      throw new DSPError(`Data plane with identifier ${id} not found`, HttpStatus.NOT_FOUND);
    }
    return datasetUpdate;
  }


}