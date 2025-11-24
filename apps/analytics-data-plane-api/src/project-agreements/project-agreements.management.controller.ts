import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Post
} from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import {
  ProjectAgreementDetailDto,
  ProjectAgreementDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { Roles } from "@tsg-dsp/common-api";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

import { ProjectAgreementsService } from "./project-agreements.service.js";

@Controller("management/project-agreements")
@ApiTags("Project Agreements")
@ApiOAuth2(["controlplane_dataplane"])
@Roles("controlplane_dataplane")
export class ProjectAgreementsManagementController {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly projectAgreementsService: ProjectAgreementsService
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get all Project Agreements",
    description: "Retrieves all project agreements."
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of project agreements retrieved successfully",
    type: [ProjectAgreementDetailDto]
  })
  @ApiForbiddenResponseDefault()
  async getAll(): Promise<ProjectAgreementDetailDto[]> {
    this.logger.log("Retrieving all project agreements");
    return await this.projectAgreementsService.findAllDto();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create Project Agreement",
    description:
      "Creates a new project agreement and initiates the signature collection process."
  })
  @ApiBody({ type: ProjectAgreementDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Project agreement created successfully",
    type: ProjectAgreementDetailDto
  })
  @ApiForbiddenResponseDefault()
  async create(
    @Body() projectAgreementDto: ProjectAgreementDto
  ): Promise<ProjectAgreementDetailDto> {
    this.logger.log(
      `Creating project agreement with id ${projectAgreementDto.id}`
    );
    return await this.projectAgreementsService.create(projectAgreementDto);
  }

  @Post(":id/sign")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Sign Project Agreement",
    description: "Signs a project agreement with the given ID."
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "Project Agreement ID"
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Project agreement signature requested successfully"
  })
  @ApiForbiddenResponseDefault()
  async signProjectAgreement(
    @Param("id", new ParseIntPipe()) id: number
  ): Promise<void> {
    this.logger.log(`Signing project agreement with id ${id}`);
    await this.projectAgreementsService.signProjectAgreement(id);
  }

  @Post(":id/link/:datasetId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Link Dataset to Project Agreement",
    description: "Links a dataset to the specified project agreement."
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "Project Agreement ID"
  })
  @ApiParam({
    name: "datasetId",
    required: true,
    description: "Dataset ID"
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Dataset linked to project agreement successfully"
  })
  @ApiForbiddenResponseDefault()
  async linkDatasetToProjectAgreement(
    @Param("id", new ParseIntPipe()) id: number,
    @Param("datasetId") datasetId: string
  ): Promise<void> {
    this.logger.log(
      `Linking dataset ${datasetId} to project agreement with id ${id}`
    );
    await this.projectAgreementsService.linkDatasetToProjectAgreement(
      id,
      datasetId
    );
  }

  @Post(":id/unlink/:datasetId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Unlink Dataset from Project Agreement",
    description: "Unlinks a dataset from the specified project agreement."
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "Project Agreement ID"
  })
  @ApiParam({
    name: "datasetId",
    required: true,
    description: "Dataset ID"
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Dataset unlinked from project agreement successfully"
  })
  @ApiForbiddenResponseDefault()
  async unlinkDatasetFromProjectAgreement(
    @Param("id", new ParseIntPipe()) id: number,
    @Param("datasetId") datasetId: string
  ): Promise<void> {
    this.logger.log(
      `Unlinking dataset ${datasetId} from project agreement with id ${id}`
    );
    await this.projectAgreementsService.unlinkDatasetFromProjectAgreement(
      id,
      datasetId
    );
  }
}
