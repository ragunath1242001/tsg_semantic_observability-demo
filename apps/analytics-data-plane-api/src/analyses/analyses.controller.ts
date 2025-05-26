import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
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
import { Roles } from "@tsg-dsp/common-api";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

import { AnalysesService } from "./analyses.service.js";
import { AnalysisDto } from "./dto/analysis.dto.js";
import { CreateAnalysisDto } from "./dto/create-analysis.dto.js";

@Controller("analyses")
@ApiTags("Analysis")
@ApiOAuth2(["controlplane_dataplane"])
@Roles("controlplane_dataplane")
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get()
  @ApiOperation({
    summary: "Get all analyses",
    description: "Retrieve all analyses"
  })
  @ApiOkResponse({ type: [AnalysisDto] })
  @ApiForbiddenResponseDefault()
  findAll() {
    return this.analysesService.getAnalyses();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Create analysis",
    description: "Create a new analysis"
  })
  @ApiBody({
    type: CreateAnalysisDto,
    description: "The analysis to create",
    required: true
  })
  @ApiResponse({
    status: 200,
    description: "The analysis has been successfully created",
    type: AnalysisDto
  })
  @ApiForbiddenResponseDefault()
  create(@Body() createAnalysisDto: CreateAnalysisDto) {
    return this.analysesService.create(createAnalysisDto);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get analysis by ID",
    description: "Retrieve an analysis by its ID"
  })
  @ApiOkResponse({ type: AnalysisDto })
  @ApiForbiddenResponseDefault()
  findOne(@Param("id") id: string) {
    const analysis = this.analysesService.getAnalyis(id);

    if (!analysis) {
      throw new HttpException(`Analysis with id ${id} not found`, 404);
    }
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete analysis by ID",
    description: "Delete an analysis by its ID"
  })
  @ApiOkResponse({ description: "The analysis has been successfully deleted" })
  @ApiForbiddenResponseDefault()
  remove(@Param("id") id: string) {
    return this.analysesService.removeAnalysis(id);
  }
}
