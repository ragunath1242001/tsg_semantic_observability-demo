import { Controller, Get } from "@nestjs/common";
import { DisableOAuthGuard } from "./auth/oauth.guard.js";

@Controller()
@DisableOAuthGuard()
export class HealthController {
  @Get("/health")
  async getHealth() {}
}
