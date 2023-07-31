import { Body, Controller, HttpCode, HttpException, HttpStatus, Param, Post } from "@nestjs/common";
import { DataPlaneCreation, DataPlaneDetailsDto } from "../../model/data-planes/dataPlanes.dto";
import { DataPlaneService } from "../../services/dataPlane.service";
import { DeserializePipe } from "../dsp/deserialize.pipe";
import { Dataset } from "../../model/dsp/catalog/catalog";
import { DatasetDto } from "../../model/dsp/catalog/catalog.dto";

@Controller('data-plane')
export class DataPlaneController {
  constructor(private readonly dataPlaneService: DataPlaneService) {}

  @Post("/init")
  @HttpCode(HttpStatus.OK)
  async init(@Body() dataPlaneDetails: DataPlaneCreation): Promise<DataPlaneDetailsDto> {
    return this.dataPlaneService.addDataPlane(dataPlaneDetails);
  }
  
  @Post("/:id/update")
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dataPlaneDetails: DataPlaneDetailsDto): Promise<DataPlaneDetailsDto> {
    if (id !== dataPlaneDetails.identifier) {
      throw new HttpException("Identifier in path and in body do not match", HttpStatus.BAD_REQUEST);
    }
    const dataPlane = await this.dataPlaneService.updateDataPlane(dataPlaneDetails);
    if (dataPlane === undefined) {
      throw new HttpException(`Data plane with identifier ${dataPlaneDetails.identifier} not found`, HttpStatus.NOT_FOUND);
    }
    return dataPlane;
  }

  @Post("/:id/catalog")
  @HttpCode(HttpStatus.OK)
  async updateCatalog(@Param('id') id: string, @Body(new DeserializePipe<DatasetDto, Dataset>()) dataset: Dataset): Promise<Dataset> {
    const datasetUpdate = await this.dataPlaneService.updateCatalog(id, dataset);
    if (datasetUpdate === undefined) {
      throw new HttpException(`Data plane with identifier ${id} not found`, HttpStatus.NOT_FOUND);
    }
    return datasetUpdate;
  }


}