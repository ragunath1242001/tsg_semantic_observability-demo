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
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  DisableOAuthGuard,
  DisableRolesGuard,
  Roles
} from "@tsg-dsp/common-api";
import {
  ApiBadRequestResponseDefault,
  ApiForbiddenResponseDefault
} from "@tsg-dsp/common-dtos";

import { RuntimeConfig } from "./config.js";
import { RuntimeConfigDto } from "./config.schemas.js";

@Roles("controlplane_admin")
@Controller("settings")
@ApiTags("Settings")
@ApiOAuth2(["controlplane_admin"])
export class ConfigController {
  constructor(private readonly runtimeConfig: RuntimeConfig) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve settings",
    description: "Retrieves the settings of the control plane."
  })
  @ApiOkResponse({ type: RuntimeConfigDto })
  @ApiForbiddenResponseDefault()
  @DisableOAuthGuard()
  @DisableRolesGuard()
  async getSettings(): Promise<RuntimeConfig> {
    return this.runtimeConfig;
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
    this.runtimeConfig.controlPlaneInteractions =
      settings.controlPlaneInteractions;
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
