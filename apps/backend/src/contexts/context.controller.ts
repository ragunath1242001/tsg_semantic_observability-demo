import { Controller, Get, Param, Res } from "@nestjs/common";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";
import { ContextService } from "./context.service.js";
import { Response } from "express";

@Controller()
@DisableOAuthGuard()
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get("context/:id")
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async getContext(
    @Param("id") id: string,
    @Res() res: Response
  ): Promise<Record<string, any> | void> {
    const context = await this.contextService.getContext(id);
    if (context.document) {
      return context.document;
    }
    if (context.documentUrl) {
      res.redirect(context.documentUrl);
    }
  }
}
