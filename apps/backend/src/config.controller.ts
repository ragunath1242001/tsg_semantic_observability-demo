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
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { RuntimeConfigDto } from "./config.schema.js";
import {
  ApiForbiddenResponseDefault,
  ApiBadRequestResponseDefault,
} from "./utils/swagger.js";

@UseGuards(OAuthGuard)
@Roles(AppRole.ISSUE_CREDENTIALS)
@Controller("settings")
@ApiTags("Settings")
@ApiOAuth2([AppRole.ISSUE_CREDENTIALS])
export class ConfigController {
  constructor(private readonly runtimeConfig: RuntimeConfig) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve settings",
    description: "Retrieve dynamic settings for this wallet",
  })
  @ApiOkResponse({ type: RuntimeConfigDto })
  @ApiForbiddenResponseDefault()
  async getSettings(): Promise<RuntimeConfig> {
    return this.runtimeConfig;
  }

  @Post("update")
  @ApiOperation({
    summary: "Update settings",
    description: "Update the dynamic settings for this wallet",
  })
  @UsePipes(validationPipe)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: RuntimeConfigDto })
  @ApiOkResponse({ type: RuntimeConfigDto })
  @ApiBadRequestResponseDefault()
  @ApiForbiddenResponseDefault()
  async updateSettings(
    @Body() settings: RuntimeConfig
  ): Promise<RuntimeConfig> {
    this.runtimeConfig.gaiaXSupport = settings.gaiaXSupport;
    return this.runtimeConfig;
  }
}
