import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CatalogDto, DatasetDto } from "@tsg-dsp/common";
import { DspClientService } from "../client/client.service";
import { normalizeAddress } from "../../utils/address";
import { ManagementGuard } from "../../auth/management.guard";
import { Dataset } from "../../model/dsp/catalog/catalog";
import { DeserializePipe } from "../../utils/deserialize.pipe";
import { CatalogService } from "./catalog.service";
import { CatalogRequestMessage } from "../../model/dsp/catalog/messages";

@UseGuards(ManagementGuard)
@Controller("management/catalog")
export class CatalogManagementController {
  constructor(
    private readonly dsp: DspClientService,
    private readonly catalogService: CatalogService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("request")
  @HttpCode(HttpStatus.OK)
  async requestCatalog(
    @Query("address") address?: string,
    @Query("audience") audience?: string
  ): Promise<CatalogDto> {
    if (address) {
      this.logger.log(
        `Received catalog request for remote connector at ${address}`
      );
      return await this.dsp.requestCatalog(
        normalizeAddress(address, 0, "catalog", "request"),
        audience
      );
    } else {
      this.logger.log(`Received catalog request for local connector`);
      return (
        await this.catalogService.request(new CatalogRequestMessage({}))
      ).serialize();
    }
  }

  @Get("dataset")
  @HttpCode(HttpStatus.OK)
  async requestDataset(
    @Query("address") address: string,
    @Query("id") id: string,
    @Query("audience") audience?: string
  ): Promise<DatasetDto> {
    if (address) {
      this.logger.log(
        `Received dataset request for remote connector at ${address} with id ${id}`
      );
      return this.dsp.requestDataset(
        normalizeAddress(address, 0, "catalog", "datasets"),
        id,
        audience
      );
    } else {
      this.logger.log(
        `Received dataset request for local connector with id ${id}`
      );
      return (await this.catalogService.getDataset(id))?.serialize();
    }
  }

  @Post("dataset")
  @HttpCode(HttpStatus.CREATED)
  async addDataset(
    @Body(new DeserializePipe(Dataset)) dataset: Dataset
  ): Promise<DatasetDto> {
    const datasetdao = await this.catalogService.addDataset(dataset);
    return new Dataset(datasetdao).serialize();
  }
}
