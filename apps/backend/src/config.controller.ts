import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { RuntimeConfig } from "./config.js";
import { OAuthGuard } from "./auth/oauth.guard.js";
import { AppRole } from "@libs/dtos";
import { Roles } from "./auth/roles.guard.js";
import { validationPipe } from "./utils/validation.pipe.js";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { RuntimeConfigDto } from "./config.schema.js";

@UseGuards(OAuthGuard)
@Roles(AppRole.ISSUE_CREDENTIALS)
@Controller("settings")
@ApiTags("Settings")
@ApiOAuth2([AppRole.ISSUE_CREDENTIALS])
export class ConfigController {
  constructor(private readonly runtimeConfig: RuntimeConfig) {}

  @Get()
  @ApiOkResponse({ type: RuntimeConfigDto })
  @ApiForbiddenResponse()
  async getSettings(): Promise<RuntimeConfig> {
    return this.runtimeConfig;
  }

  @Post("update")
  @UsePipes(validationPipe)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: RuntimeConfigDto })
  @ApiOkResponse({ type: RuntimeConfigDto })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  async updateSettings(
    @Body() settings: RuntimeConfig
  ): Promise<RuntimeConfig> {
    this.runtimeConfig.gaiaXSupport = settings.gaiaXSupport;
    return this.runtimeConfig;
  }
}
