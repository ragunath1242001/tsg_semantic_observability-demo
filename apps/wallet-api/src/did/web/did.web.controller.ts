import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DisableOAuthGuard } from "@tsg-dsp/common-api";
import { DIDDocumentDto } from "@tsg-dsp/common-dtos";
import { DIDDocument } from "did-resolver";

import { DidService } from "../did.service.js";
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
      "Retrieves the public DID document on the well-known address for this wallet"
  })
  @ApiOkResponse({ type: DIDDocumentDto })
  async getDid(): Promise<DIDDocument> {
    return this.didWebStrategy.getWellKnownDidDocument(
      await this.didService.getDid()
    );
  }
}
