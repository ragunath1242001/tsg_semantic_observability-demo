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

@Controller()
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
      "Retrieves the current health of the control plane. If the control plane is running it always returns an empty 200 OK"
  })
  @ApiOkResponse()
  @ApiBadGatewayResponse()
  @HealthCheck()
  async getHealth() {
    const { heapUsed, rss } = process.memoryUsage();
    return this.health.check([
      async () => this.db.pingCheck("database", { timeout: 300 }),
      async () => {
        return {
          memory: {
            status: "up",
            heapMb: heapUsed >> 20,
            rssMb: rss >> 20
          }
        };
      }
    ]);
  }
}
