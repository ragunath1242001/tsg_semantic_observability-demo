import { Controller, Get } from "@nestjs/common";
import { DisableOAuthGuard } from "./auth/oauth.guard.js";
import { ApiBadGatewayResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";

@Controller()
@DisableOAuthGuard()
@ApiTags("Health")
export class HealthController {
  @Get("/health")
  @ApiOkResponse()
  @ApiBadGatewayResponse()
  async getHealth() {}
}
