import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { RuntimeConfig } from "./config.js";
import { OAuthGuard } from "./auth/oauth.guard.js";
import { AppRole } from "@libs/dtos";
import { Roles } from "./auth/roles.guard.js";

@UseGuards(OAuthGuard)
@Roles(AppRole.ISSUE_CREDENTIALS)
@Controller("settings")
export class ConfigController {
  constructor(private readonly runtimeConfig: RuntimeConfig) {}

  @Get()
  async getSettings(): Promise<RuntimeConfig> {
    return this.runtimeConfig;
  }

  @Post("update")
  @UsePipes(new ValidationPipe())
  @HttpCode(HttpStatus.OK)
  async updateSettings(
    @Body() settings: RuntimeConfig
  ): Promise<RuntimeConfig> {
    this.runtimeConfig.gaiaXSupport = settings.gaiaXSupport;
    return this.runtimeConfig;
  }
}
