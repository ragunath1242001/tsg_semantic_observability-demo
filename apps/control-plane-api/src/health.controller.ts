import { Controller, Get } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

@Controller()
@ApiTags("Health")
export class HealthController {
  @Get("/health")
  @ApiOperation({
    summary: "Health check",
    description:
      "Retrieves the current health of the control plane. If the control plane is running it always returns an empty 200 OK",
  })
  @ApiOkResponse()
  @ApiBadGatewayResponse()
  async getHealth() {}
}
