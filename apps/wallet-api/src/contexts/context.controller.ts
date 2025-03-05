import { Controller, Get, HttpStatus, Param } from "@nestjs/common";
import { ContextService } from "./context.service.js";
import { AppError } from "@tsg-dsp/common-api";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DisableOAuthGuard } from "@tsg-dsp/common-api";

@Controller()
@DisableOAuthGuard()
@ApiTags("Contexts")
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get("context/:id")
  @ApiOperation({
    summary: "Retrieve context",
    description: "Retrieves JSON-LD context document for the given context"
  })
  @ApiOkResponse({ schema: { type: "object" } })
  async getContext(
    @Param("id") id: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
