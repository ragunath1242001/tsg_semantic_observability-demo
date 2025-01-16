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
import { AppRole } from "@tsg-dsp/wallet-dtos";
import { ContextService } from "./context.service.js";
import { JSONLDContext } from "../model/context.dao.js";
import { JsonLdContextConfig } from "../config.js";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { JSONLDContextDto, JsonLdContextConfigDto } from "./context.schemas.js";
import {
  ApiForbiddenResponseDefault,
  ApiConflictResponseDefault,
  ApiBadRequestResponseDefault,
  ApiNotFoundResponseDefault
} from "@tsg-dsp/common-dtos";
import { Roles, validationPipe } from "@tsg-dsp/common-api";

@Controller("management/contexts")
@ApiTags("Management Contexts")
@ApiOAuth2([AppRole.VIEW_DID])
@Roles(AppRole.VIEW_DID)
export class ContextManagementController {
  constructor(private readonly contextService: ContextService) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve contexts",
    description: "Retrieve all context registered in this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [JSONLDContextDto] })
  @ApiForbiddenResponseDefault()
  async getContexts(): Promise<JSONLDContext[]> {
    return await this.contextService.getContexts();
  }

  @Post()
  @ApiOperation({
    summary: "Add context",
    description: "Register a new context in this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: JsonLdContextConfigDto })
  @ApiOkResponse({ type: JSONLDContextDto })
  @ApiConflictResponseDefault()
  @ApiForbiddenResponseDefault()
  @ApiBadRequestResponseDefault()
  async addContext(
    @Body(validationPipe) service: JsonLdContextConfig
  ): Promise<JSONLDContext> {
    return await this.contextService.insertContext(service);
  }

  @Put(":id")
  @ApiOperation({
    summary: "Update context",
    description: "Update an existing context in this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: JsonLdContextConfigDto })
  @ApiOkResponse({ type: JSONLDContextDto })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @ApiBadRequestResponseDefault()
  async updateContext(
    @Param("id") id: string,
    @Body(validationPipe)
    service: JsonLdContextConfig
  ): Promise<JSONLDContext> {
    return await this.contextService.updateContext(id, service);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete context",
    description: "Delete an existing context in this wallet"
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async deleteContext(@Param("id") id: string): Promise<void> {
    return await this.contextService.deleteContext(id);
  }
}
