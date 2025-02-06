import { Controller, Get } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { OauthService } from "./oauth.service.js";

@Controller()
@ApiTags("Well-known endpoint")
export class MetadataController {
  constructor(private readonly oauthService: OauthService) {}

  @Get("/.well-known/openid-configuration")
  @ApiOperation({
    summary: "Open ID Configuration",
    description: "Find all the open ID metadata for the OAuth server"
  })
  @ApiOkResponse()
  @ApiBadGatewayResponse()
  async getOpenIDConfiguration() {
    return this.oauthService.getOpenIDConfiguration();
  }
}
