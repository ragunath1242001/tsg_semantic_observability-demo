import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post
} from "@nestjs/common";
import {
  Catalog,
  CatalogSchema,
  DataPlaneCreation,
  DataPlaneDetailsDto
} from "@tsg-dsp/common-dsp";
import { DeserializePipe } from "../utils/deserialize.pipe.js";
import { DSPError } from "../utils/errors/error.js";
import { DataPlaneService } from "./dataPlane.service.js";
import {
  ApiOAuth2,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiBody
} from "@nestjs/swagger";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import { Roles } from "@tsg-dsp/common-api";

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
    description: "Initializes a new data plane with the provided details."
  })
  @ApiBody({ type: DataPlaneCreation })
  @ApiOkResponse({ type: DataPlaneDetailsDto })
  @ApiBadRequestResponse({ description: "Invalid data plane details provided" })
  @ApiForbiddenResponseDefault()
  async init(
    @Body() dataPlaneDetails: DataPlaneCreation
  ): Promise<DataPlaneDetailsDto> {
    this.logger.log(
      `Received init from data plane: ${JSON.stringify(dataPlaneDetails)}`
    );
    return this.dataPlaneService.addDataPlane(dataPlaneDetails);
  }

  @Post("/:id/update")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update data plane",
    description: "Updates the details of an existing data plane."
  })
  @ApiBody({ type: DataPlaneDetailsDto })
  @ApiOkResponse({ type: DataPlaneDetailsDto })
  @ApiBadRequestResponse({ description: "Identifier mismatch or invalid data" })
  @ApiForbiddenResponseDefault()
  async update(
    @Param("id") id: string,
    @Body() dataPlaneDetails: DataPlaneDetailsDto
  ): Promise<DataPlaneDetailsDto> {
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
    description: "Updates the catalog for the specified data plane."
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
