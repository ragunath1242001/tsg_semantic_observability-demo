import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "@libs/dtos";
import { ContextService } from "./context.service.js";
import { JSONLDContext } from "../model/context.dao.js";
import { JsonLdContextConfig } from "../config.js";
import { validationPipe } from "../utils/validation.pipe.js";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JSONLDContextDto, JsonLdContextConfigDto } from "./context.schemas.js";

@Controller("management/contexts")
@ApiTags("Management Contexts")
@ApiOAuth2([AppRole.VIEW_DID])
@Roles(AppRole.VIEW_DID)
export class ContextManagementController {
  constructor(private readonly contextService: ContextService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [JSONLDContextDto] })
  @ApiForbiddenResponse()
  async getContexts(): Promise<JSONLDContext[]> {
    return await this.contextService.getContexts();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: JsonLdContextConfigDto })
  @ApiOkResponse({ type: JSONLDContextDto })
  @ApiConflictResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  async addContext(
    @Body(validationPipe) service: JsonLdContextConfig
  ): Promise<JSONLDContext> {
    return await this.contextService.insertContext(service);
  }

  @Put(":id")
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: JsonLdContextConfigDto })
  @ApiOkResponse({ type: JSONLDContextDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  async updateContext(
    @Param("id") id: string,
    @Body(validationPipe)
    service: JsonLdContextConfig
  ): Promise<JSONLDContext> {
    return await this.contextService.updateContext(id, service);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  async deleteContext(@Param("id") id: string): Promise<void> {
    return await this.contextService.deleteContext(id);
  }
}
