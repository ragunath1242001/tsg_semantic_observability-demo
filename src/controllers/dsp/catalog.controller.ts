import { LDCatalog, LDDataset } from "../../model/dsp/catalog/catalog.schema";
import { LDCatalogRequestMessage } from "../../model/dsp/catalog/messages.schema";
import { Body, Controller, HttpException, HttpStatus } from "@nestjs/common";
import { Get, HttpCode, Param, Post } from "@nestjs/common/decorators";
import { CatalogRequestMessage } from "../../model/dsp/catalog/messages";
import { CatalogService } from "../../services/catalog.service";
import { DeserializePipe } from "./deserialize.pipe";

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}
  @Post('request')
  @HttpCode(200)
  async request(@Body(new DeserializePipe<LDCatalogRequestMessage, CatalogRequestMessage>()) body: CatalogRequestMessage): Promise<LDCatalog> {
    if (body instanceof CatalogRequestMessage) {
      const catalog = await this.catalogService.request(body);
      return catalog.serialize();
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Get('datasets/:id')
  async getDataset(@Param('id') id: string): Promise<LDDataset> {
    const dataset = await this.catalogService.getDataset(id)
    if (dataset) {
      return dataset.serialize();
    } else {
      throw new HttpException('Dataset not found', 404)
    }
  }
}
