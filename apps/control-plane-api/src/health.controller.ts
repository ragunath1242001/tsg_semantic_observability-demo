import { Controller, Get } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckResult,
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
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        memory: {
          type: "object",
          properties: {
            status: { type: "string" },
            heapMb: { type: "number" },
            rssMb: { type: "number" }
          }
        }
      }
    },
    example: { memory: { status: "up", heapMb: 8000, rssMb: 80000 } }
  })
  @ApiBadGatewayResponse()
  @HealthCheck()
  async getHealth(): Promise<HealthCheckResult> {
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
