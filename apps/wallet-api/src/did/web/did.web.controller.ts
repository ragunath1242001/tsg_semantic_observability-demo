import { Controller, Get } from "@nestjs/common";
import { DIDDocument } from "did-resolver";
import { DisableOAuthGuard } from "../../auth/oauth.guard.js";
import { DidService } from "../did.service.js";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DIDDocumentDto } from "../did.schemas.js";
import { DidWebStrategy } from "./did.web.strategy.js";

@Controller()
@DisableOAuthGuard()
@ApiTags("DID Web")
export class DIDWebController {
  constructor(
    private readonly didService: DidService,
    private readonly didWebStrategy: DidWebStrategy
  ) {}

  @Get(".well-known/did.json")
  @ApiOperation({
    summary: "Retrieve DID document",
    description:
      "Retrieves the public DID document on the well-known address for this wallet",
  })
  @ApiOkResponse({ type: DIDDocumentDto })
  async getDid(): Promise<DIDDocument> {
    return this.didWebStrategy.getWellKnownDidDocument(
      await this.didService.getDid()
    );
  }
}
