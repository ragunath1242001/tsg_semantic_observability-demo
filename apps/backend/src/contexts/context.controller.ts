import { Controller, Get, HttpStatus, Param } from "@nestjs/common";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";
import { ContextService } from "./context.service.js";
import { AppError } from "../utils/error.js";
import { ApiTags } from "@nestjs/swagger";

@Controller()
@DisableOAuthGuard()
@ApiTags("Contexts")
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get("context/:id")
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async getContext(
    @Param("id") id: string
  ): Promise<Record<string, any> | void> {
    const context = await this.contextService.getContext(id);
    if (context.document) {
      return context.document;
    }
    throw new AppError(
      `No context document found for context ${id}`,
      HttpStatus.NOT_FOUND
    );
  }
}
