import { CatalogDto, DatasetDto } from "../../model/dsp/catalog/catalog.dto";
import { Body, Controller, HttpStatus, Logger } from "@nestjs/common";
import { Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common/decorators";
import { CatalogRequestMessage } from "../../model/dsp/catalog/messages";
import { CatalogService } from "../../services/dsp/catalog.service";
import { DeserializePipe } from "../../utils/deserialize.pipe";
import { DSPError } from "../../utils/errors/error";
import { VerifiablePresentationGuard } from "../../auth/verifiablePresentation.guard";

@UseGuards(VerifiablePresentationGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}
  private readonly logger = new Logger(this.constructor.name);
  
  @Post('request')
  @HttpCode(HttpStatus.OK)
  async request(@Body(new DeserializePipe(CatalogRequestMessage)) body: CatalogRequestMessage): Promise<CatalogDto> {
    this.logger.log(`Received catalog request`);
    const result = await this.catalogService.request(body);
    return result.serialize();
  }

  @Get('datasets/:id')
  @HttpCode(HttpStatus.OK)
  async getDataset(@Param('id') id: string): Promise<DatasetDto> {
    this.logger.log(`Received dataset request for id ${id}`);
    const result = await this.catalogService.getDataset(id)
    if (result) {
      return result.serialize();
    } else {
      throw new DSPError('Dataset not found', HttpStatus.NOT_FOUND)
    }
  }
}
