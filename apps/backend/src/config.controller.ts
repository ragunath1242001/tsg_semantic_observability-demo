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
import { ManagementGuard } from "./auth/management.guard";
import { RuntimeConfig } from "./config";

@UseGuards(ManagementGuard)
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
