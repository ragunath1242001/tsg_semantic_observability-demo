import { Controller, Get } from "@nestjs/common";
import { DisableJwtGuard } from "./auth/jwt.guard.js";

@Controller()
@DisableJwtGuard(true)
export class HealthController {
  @Get("/health")
  async getHealth() {}
}
