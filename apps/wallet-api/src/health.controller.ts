import { Controller, Get } from "@nestjs/common";
import { DisableOAuthGuard } from "./auth/oauth.guard.js";
import {
  ApiBadGatewayResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";

@Controller()
@DisableOAuthGuard()
@ApiTags("Health")
export class HealthController {
  @Get("/health")
  @ApiOperation({
    summary: "Health check",
    description:
      "Retrieves the current health of the wallet. If the wallet is running it always returns an empty 200 OK"
  })
  @ApiOkResponse()
  @ApiBadGatewayResponse()
  async getHealth() {}
}
