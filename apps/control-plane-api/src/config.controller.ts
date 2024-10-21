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
import {
  ApiOperation,
  ApiOkResponse,
  ApiOAuth2,
  ApiTags,
  ApiBody,
} from "@nestjs/swagger";
import { RuntimeConfigDto } from "./config.schemas";
import {
  ApiForbiddenResponseDefault,
  ApiBadRequestResponseDefault,
} from "@tsg-dsp/common-dtos";

@UseGuards(OAuthGuard)
@Roles("controlplane_admin")
@Controller("settings")
@ApiTags("Settings")
@ApiOAuth2(["controlplane_admin"])
export class ConfigController {
  constructor(private readonly configService: RuntimeConfig) {}

  @Get()
  @ApiOperation({
    summary: "Retrieve settings",
    description: "Retrieves the settings of the control plane.",
  })
  @ApiOkResponse({ type: RuntimeConfigDto })
  @ApiForbiddenResponseDefault()
  async getSettings(): Promise<RuntimeConfig> {
    return this.configService;
  }

  @Post("update")
  @UsePipes(new ValidationPipe())
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update settings",
    description: "Updates runtime settings for the control plane.",
  })
  @ApiBody({ type: RuntimeConfigDto })
  @ApiOkResponse({ type: RuntimeConfigDto })
  @ApiBadRequestResponseDefault()
  @ApiForbiddenResponseDefault()
  async updateSettings(
    @Body() settings: RuntimeConfig
  ): Promise<RuntimeConfig> {
    this.configService.controlPlaneInteractions =
      settings.controlPlaneInteractions;
    return settings;
  }
}
