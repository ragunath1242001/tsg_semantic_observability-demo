import { Controller, Get, Header, Param } from "@nestjs/common";
import { DisableOAuthGuard } from "../../auth/oauth.guard.js";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DidTdwStrategy } from "./did.tdw.strategy.js";
import { DIDDocumentDto } from "@tsg-dsp/common-dtos";
import { DIDDocument } from "did-resolver";
import { DidService } from "../did.service.js";

@Controller()
@DisableOAuthGuard()
@ApiTags("DID Tdw")
export class DIDTdwController {
  constructor(
    private readonly didService: DidService,
    private readonly didTdwStrategy: DidTdwStrategy
  ) {}

  @Get(".well-known/did.json")
  @ApiOperation({
    summary: "Retrieve DID document",
    description:
      "Retrieves the public DID document on the well-known address for this wallet"
  })
  @ApiOkResponse({ type: DIDDocumentDto })
  async getDid(): Promise<DIDDocument> {
    return this.didTdwStrategy.getWellKnownDidDocument(
      await this.didService.getDid()
    );
  }

  @Get(":scid/did.jsonl")
  @Header("Content-Type", "application/x-jsonlines; charset=utf-8")
  @ApiOperation({
    summary: "Retrieve DID logs",
    description:
      "Retrieves the public DID log entries for this wallet in JSON Lines format"
  })
  @ApiOkResponse({ type: String })
  async getDidLog(@Param("scid") scid: string): Promise<string> {
    return await this.didTdwStrategy.getDidLog(scid);
  }
}
