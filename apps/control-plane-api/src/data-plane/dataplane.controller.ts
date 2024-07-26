import { DataPlaneCreation, IDataPlaneDto } from "@tsg-dsp/control-plane-dtos";
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
import { Catalog } from "@tsg-dsp/common-dsp";
import { OAuthGuard } from "../auth/oauth.guard";
import { Roles } from "../auth/roles.guard";
import { DeserializePipe } from "../utils/deserialize.pipe";
import { DSPError } from "../utils/errors/error";
import { DataPlaneService } from "./dataPlane.service";
import {
  ApiOAuth2,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiBody,
} from "@nestjs/swagger";
import { DataPlaneCreationDto, DataPlaneDto } from "./dataplane.schemas";
import { ApiForbiddenResponseDefault } from "../utils/swagger";
import { CatalogSchema } from "../dsp/catalog/catalog.schema";

@UseGuards(OAuthGuard)
@Roles(["controlplane_admin", "controlplane_dataplane"])
@Controller("data-plane")
@ApiTags("Data Plane")
@ApiOAuth2(["controlplane_admin", "controlplane_dataplane"])
export class DataPlaneController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly dataPlaneService: DataPlaneService) {}

  @Post("/init")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Initialize data plane",
    description: "Initializes a new data plane with the provided details.",
  })
  @ApiBody({ type: DataPlaneCreationDto })
  @ApiOkResponse({ type: DataPlaneDto })
  @ApiBadRequestResponse({ description: "Invalid data plane details provided" })
  @ApiForbiddenResponseDefault()
  async init(
    @Body() dataPlaneDetails: DataPlaneCreation
  ): Promise<IDataPlaneDto> {
    this.logger.log(
      `Received init from data plane: ${JSON.stringify(dataPlaneDetails)}`
    );
    return this.dataPlaneService.addDataPlane(dataPlaneDetails);
  }

  @Post("/:id/update")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update data plane",
    description: "Updates the details of an existing data plane.",
  })
  @ApiBody({ type: DataPlaneDto })
  @ApiOkResponse({ type: DataPlaneDto })
  @ApiBadRequestResponse({ description: "Identifier mismatch or invalid data" })
  @ApiForbiddenResponseDefault()
  async update(
    @Param("id") id: string,
    @Body() dataPlaneDetails: IDataPlaneDto
  ): Promise<IDataPlaneDto> {
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
    return await this.dataPlaneService.updateDataPlane(dataPlaneDetails);
  }

  @Post("/:id/catalog")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update catalog",
    description: "Updates the catalog for the specified data plane.",
  })
  @ApiBody({ type: CatalogSchema })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiBadRequestResponse({ description: "Invalid catalog data" })
  @ApiForbiddenResponseDefault()
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
