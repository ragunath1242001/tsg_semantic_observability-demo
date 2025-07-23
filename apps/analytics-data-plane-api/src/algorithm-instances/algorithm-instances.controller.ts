import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import {
  AlgorithmInstanceDto,
  CreateAlgorithmInstanceDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { Roles } from "@tsg-dsp/common-api";
import { CatalogDto, CatalogSchema } from "@tsg-dsp/common-dsp";
import {
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault
} from "@tsg-dsp/common-dtos";

import { AlgorithmInstancesService } from "./algorithm-instances.service.js";

@Controller("algorithm-instances")
@ApiTags("Algorithm Instances")
@ApiOAuth2(["controlplane_dataplane"])
@Roles("controlplane_dataplane")
export class AlgorithmInstancesController {
  constructor(
    private readonly algorithmInstancesService: AlgorithmInstancesService
  ) {}

  @Get()
  @ApiOperation({
    summary: "Get all algorithm instances",
    description: "Retrieve all algorithm instances"
  })
  @ApiOkResponse({ type: [AlgorithmInstanceDto] })
  @ApiForbiddenResponseDefault()
  findAll() {
    return this.algorithmInstancesService.getAlgorithmInstances();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Create algorithm instance",
    description: "Create a new algorithm instance"
  })
  @ApiBody({
    type: AlgorithmInstanceDto,
    description: "The algorithm instance to create",
    required: true
  })
  @ApiResponse({
    status: 200,
    description: "The algorithm instance has been successfully created",
    type: CreateAlgorithmInstanceDto
  })
  @ApiForbiddenResponseDefault()
  create(@Body() createAlgorithmInstance: CreateAlgorithmInstanceDto) {
    return this.algorithmInstancesService.createAlgorithmInstance(
      createAlgorithmInstance
    );
  }

  @Get("catalogs/:participantId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get catalog by participant ID",
    description: "Fetches a specific catalog by its participant ID."
  })
  @ApiOkResponse({ type: CatalogSchema })
  @ApiForbiddenResponseDefault()
  @ApiNotFoundResponseDefault()
  async getCatalogByParticipantId(
    @Param("participantId") participantId: string
  ): Promise<CatalogDto> {
    return await this.algorithmInstancesService.getParticipantCatalog(
      participantId
    );
  }

  @Get("transfer/:transferId")
  @ApiOperation({
    summary: "Get an algorithm instance by transfer ID",
    description: "Retrieve an algorithm instance by its associated transfer ID"
  })
  @ApiOkResponse({ type: AlgorithmInstanceDto })
  @ApiForbiddenResponseDefault()
  findByTransferId(@Param("transferId") transferId: string) {
    return this.algorithmInstancesService.getAlgorithmInstanceFromTransferId(
      transferId
    );
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get an algorithm instance by ID",
    description: "Retrieve an algorithm instance by its ID"
  })
  @ApiOkResponse({ type: AlgorithmInstanceDto })
  @ApiForbiddenResponseDefault()
  async findOne(@Param("id") id: string) {
    return await this.algorithmInstancesService.getAlgorithmInstanceDto(id);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete an algorithm instance by ID",
    description: "Delete an algorithm instance by its ID"
  })
  @ApiOkResponse({
    description: "The algorithm instance has been successfully deleted"
  })
  @ApiForbiddenResponseDefault()
  remove(@Param("id") id: string) {
    return this.algorithmInstancesService.removeAlgorithmInstance(id);
  }
}
