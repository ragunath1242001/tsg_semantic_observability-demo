import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  UsePipes
} from "@nestjs/common";
import { RuntimeConfig } from "./config.js";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { RuntimeConfigDto } from "./config.schemas.js";
import {
  ApiForbiddenResponseDefault,
  ApiBadRequestResponseDefault
} from "@tsg-dsp/common-dtos";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  DisableOAuthGuard,
  DisableRolesGuard,
  Roles,
  validationPipe
} from "@tsg-dsp/common-api";
import { AppRole } from "@tsg-dsp/wallet-dtos";

@Roles(AppRole.ISSUE_CREDENTIALS)
@Controller("settings")
@ApiTags("Settings")
@ApiOAuth2([AppRole.ISSUE_CREDENTIALS])
export class ConfigController {
  constructor(private readonly runtimeConfig: RuntimeConfig) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve settings",
    description: "Retrieve dynamic settings for this wallet"
  })
  @ApiOkResponse({ type: RuntimeConfigDto })
  @ApiForbiddenResponseDefault()
  @DisableOAuthGuard()
  @DisableRolesGuard()
  async getSettings(): Promise<RuntimeConfig> {
    return this.runtimeConfig;
  }

  @Post("update")
  @ApiOperation({
    summary: "Update settings",
    description: "Update the dynamic settings for this wallet"
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
    this.runtimeConfig.title = settings.title;
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
