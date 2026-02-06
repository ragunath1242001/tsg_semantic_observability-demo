import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DisableAbac, DisableOAuthGuard, Requires } from "@tsg-dsp/common-api";
import {
  Action,
  ApiBadRequestResponseDefault,
  ApiForbiddenResponseDefault,
  Resource
} from "@tsg-dsp/common-dtos";

import { RootConfig, RuntimeConfig } from "./config.js";
import { RuntimeConfigDto } from "./config.schemas.js";

@Requires(Action.UPDATE, Resource.ADP_CONFIG)
@Controller("settings")
@ApiTags("Settings")
export class ConfigController {
  constructor(
    private readonly runtimeConfig: RuntimeConfig,
    private readonly rootConfig: RootConfig
  ) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve settings",
    description: "Retrieves the settings of the control plane."
  })
  @ApiOkResponse({ type: RuntimeConfigDto })
  @ApiForbiddenResponseDefault()
  @DisableOAuthGuard()
  @DisableAbac
  async getSettings(): Promise<RuntimeConfig> {
    return this.runtimeConfig;
  }

  @Get("mode")
  @ApiOperation({
    summary: "Retrieve runtime mode",
    description:
      "Retrieves the analytics data plane runtime mode (standalone/client/server)."
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { mode: { type: "string", example: "standalone" } }
    }
  })
  @ApiForbiddenResponseDefault()
  @DisableOAuthGuard()
  @DisableAbac
  async getMode(): Promise<{ mode: string }> {
    return { mode: this.rootConfig.split.mode };
  }

  @Post("update")
  @UsePipes(new ValidationPipe())
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update settings",
    description: "Updates runtime settings for the control plane."
  })
  @ApiBody({ type: RuntimeConfigDto })
  @ApiOkResponse({ type: RuntimeConfigDto })
  @ApiBadRequestResponseDefault()
  @ApiForbiddenResponseDefault()
  async updateSettings(
    @Body() settings: RuntimeConfig
  ): Promise<RuntimeConfig> {
    this.runtimeConfig.color = settings.color;
    this.runtimeConfig.darkThemeUrl = settings.darkThemeUrl;
    this.runtimeConfig.lightThemeUrl = settings.lightThemeUrl;
    return this.runtimeConfig;
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file[]"))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Upload logo",
    description:
      "Uploads logo for the control plane, receive a base64 encoded url."
  })
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return `data:image/svg+xml;base64,${file.buffer.toString("base64")}`;
  }
}
