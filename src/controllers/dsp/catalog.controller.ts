import { CatalogDto, DatasetDto } from "../../model/dsp/catalog/catalog.dto";
import { CatalogRequestMessageDto } from "../../model/dsp/catalog/messages.dto";
import { Body, Controller, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Get, HttpCode, Param, Post } from "@nestjs/common/decorators";
import { CatalogRequestMessage } from "../../model/dsp/catalog/messages";
import { CatalogService } from "../../services/dsp/catalog.service";
import { DeserializePipe } from "./deserialize.pipe";

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}
  private readonly logger = new Logger(this.constructor.name);
  @Post('request')
  @HttpCode(HttpStatus.OK)
  async request(@Body(new DeserializePipe(CatalogRequestMessage)) body: CatalogRequestMessage): Promise<CatalogDto> {
    this.logger.log(`Received catalog request`);
    if (body instanceof CatalogRequestMessage) {
      const result = await this.catalogService.request(body);
      return result.serialize();
    }
    throw new HttpException('Unkown request body', HttpStatus.BAD_REQUEST)
  }

  @Get('datasets/:id')
  @HttpCode(HttpStatus.OK)
  async getDataset(@Param('id') id: string): Promise<DatasetDto> {
    this.logger.log(`Received dataset request for id ${id}`);
    const result = await this.catalogService.getDataset(id)
    if (result) {
      return result.serialize();
    } else {
      throw new HttpException('Dataset not found', HttpStatus.NOT_FOUND)
    }
  }
}
