import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { RuntimeConfig } from "./config";
import { OAuthGuard } from "./auth/oauth.guard";
import { Roles } from "./auth/roles.guard";

@UseGuards(OAuthGuard)
@Roles("controlplane_admin")
@Controller("settings")
export class ConfigController {
  constructor(private readonly configService: RuntimeConfig) {}

  @Get()
  async getSettings(): Promise<RuntimeConfig> {
    return this.configService;
  }

  @Post("update")
  @UsePipes(new ValidationPipe())
  @HttpCode(HttpStatus.OK)
  async updateSettings(
    @Body() settings: RuntimeConfig
  ): Promise<RuntimeConfig> {
    this.configService.controlPlaneInteractions =
      settings.controlPlaneInteractions;
    return settings;
  }
}
