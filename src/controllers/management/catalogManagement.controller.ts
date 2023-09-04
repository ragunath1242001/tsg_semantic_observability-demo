import { Controller, Get, HttpCode, HttpStatus, Logger, Query, UseGuards } from "@nestjs/common";
import { CatalogDto, DatasetDto } from "../../model/dsp/catalog/catalog.dto";
import { DspClientService } from "../../services/dsp/client.service";
import { normalizeAddress } from "../../utils/address";
import { ManagementGuard } from "../../auth/management.guard";

@UseGuards(ManagementGuard)
@Controller('management/catalog')
export class CatalogManagementController {
  constructor(private readonly dsp: DspClientService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get("request")
  @HttpCode(HttpStatus.OK)
  async requestCatalog(@Query('address') address: string, @Query('audience') audience?: string): Promise<CatalogDto> {
    this.logger.log(`Received catalog request for ${address}`);
    return this.dsp.requestCatalog(normalizeAddress(address, 0, "catalog", "request"), audience);
  }

  @Get("dataset")
  @HttpCode(HttpStatus.OK)
  async requestDataset(@Query('address') address: string, @Query('id') id: string, @Query('audience') audience?: string): Promise<DatasetDto> {
    this.logger.log(`Received dataset request for ${address} with id ${id}`);
    return this.dsp.requestDataset(normalizeAddress(address, 0, "catalog", "dataset"), id, audience);
  }
}