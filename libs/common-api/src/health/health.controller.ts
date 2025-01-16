import { Controller, Get } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator
} from "@nestjs/terminus";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";

@Controller()
@DisableOAuthGuard()
@ApiTags("Health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator
  ) {}
  @Get("/health")
  @ApiOperation({
    summary: "Health check",
    description:
      "Retrieves the current health of the app. If the app is running and it is connected to the database it always returns an empty 200 OK"
  })
  @ApiOkResponse()
  @ApiBadGatewayResponse()
  @HealthCheck()
  async getHealth() {
    return this.health.check([
      async () => this.db.pingCheck("database", { timeout: 300 })
    ]);
  }
}
