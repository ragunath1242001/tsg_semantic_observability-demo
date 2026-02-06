import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Requires, validationPipe } from "@tsg-dsp/common-api";
import {
  Action,
  ApiBadRequestResponseDefault,
  ApiConflictResponseDefault,
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { IssueConfigurationConfig } from "../config.js";
import { IssueConfiguration } from "../model/issue-configuration.dao.js";
import {
  IssueConfigurationConfigDto,
  IssueConfigurationDto
} from "./issue-configuration.schemas.js";
import { IssueConfigurationService } from "./issue-configuration.service.js";

@Controller("management/issue-configurations")
@ApiTags("Management Issue Configurations")
@Requires(Action.READ, Resource.W_ISSUE_CONFIG)
export class IssueConfigurationManagementController {
  constructor(
    private readonly issueConfigurationService: IssueConfigurationService
  ) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve issue configurations",
    description: "Retrieve all issue configurations registered in this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [IssueConfigurationDto] })
  @ApiForbiddenResponseDefault()
  async getIssueConfigurations(): Promise<IssueConfiguration[]> {
    return await this.issueConfigurationService.getIssueConfigurations();
  }

  @Post()
  @ApiOperation({
    summary: "Add issue configuration",
    description: "Register a new issue configuration in this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: IssueConfigurationConfigDto })
  @ApiOkResponse({ type: IssueConfigurationDto })
  @ApiConflictResponseDefault()
  @ApiForbiddenResponseDefault()
  @ApiBadRequestResponseDefault()
  @Requires(Action.CREATE, Resource.W_ISSUE_CONFIG)
  async addIssueConfiguration(
    @Body(validationPipe) service: IssueConfigurationConfig
  ): Promise<IssueConfiguration> {
    return await this.issueConfigurationService.insertIssueConfiguration(
      service
    );
  }

  @Put(":id")
  @ApiOperation({
    summary: "Update issue configuration",
    description: "Update an existing issue configuration in this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: IssueConfigurationConfigDto })
  @ApiOkResponse({ type: IssueConfigurationDto })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @ApiBadRequestResponseDefault()
  @Requires(Action.UPDATE, Resource.W_ISSUE_CONFIG)
  async updateIssueConfiguration(
    @Param("id") id: string,
    @Body(validationPipe)
    service: IssueConfigurationConfig
  ): Promise<IssueConfiguration> {
    return await this.issueConfigurationService.updateIssueConfiguration(
      id,
      service
    );
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete issue configuration",
    description: "Delete an existing issue configuration in this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @Requires(Action.DELETE, Resource.W_ISSUE_CONFIG)
  async deleteIssueConfiguration(@Param("id") id: string): Promise<void> {
    return await this.issueConfigurationService.deleteIssueConfiguration(id);
  }
}
