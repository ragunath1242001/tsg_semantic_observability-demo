import { Body, Controller, HttpStatus, Logger } from "@nestjs/common";
import {
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common/decorators";
import {
  CatalogDto,
  CatalogRequestMessage,
  DatasetDto,
} from "@libs/common-dsp";
import { VerifiablePresentationGuard } from "../../auth/verifiablePresentation.guard";
import { DeserializePipe } from "../../utils/deserialize.pipe";
import { CatalogService } from "./catalog.service";
import {
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { ApiForbiddenResponseDefault } from "../../utils/swagger";
import {
  CatalogRequestMessageSchema,
  CatalogSchema,
  DatasetSchema,
} from "./catalog.schema";

@UseGuards(VerifiablePresentationGuard)
@Controller("catalog")
@ApiTags("Catalog")
@ApiBearerAuth()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}
  private readonly logger = new Logger(this.constructor.name);

  @Post("request")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request catalog",
    description: "Requests a catalog with the provided details.",
  })
  @ApiBody({ type: CatalogRequestMessageSchema })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiBadRequestResponse({ description: "Invalid catalog request data" })
  @ApiForbiddenResponseDefault()
  async request(
    @Body(new DeserializePipe(CatalogRequestMessage))
    body: CatalogRequestMessage
  ): Promise<CatalogDto> {
    this.logger.log(`Received catalog request`);
    return (await this.catalogService.request(body)).serialize();
  }

  @Get("datasets/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get dataset",
    description: "Fetches a dataset by ID.",
  })
  @ApiOkResponse({ type: DatasetSchema })
  @ApiBadRequestResponse({ description: "Invalid dataset ID" })
  @ApiForbiddenResponseDefault()
  async getDataset(@Param("id") id: string): Promise<DatasetDto> {
    this.logger.log(`Received dataset request for id ${id}`);
    const result = (await this.catalogService.getDataset(id)).serialize();
    return result;
  }
}
