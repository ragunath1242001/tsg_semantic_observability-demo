import { Controller, Get, HttpStatus } from "@nestjs/common";
import { DIDDocument } from "did-resolver";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";
import { AppError } from "../utils/error.js";
import { DidService } from "./did.service.js";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DIDDocumentDto } from "./did.schemas.js";

@Controller()
@DisableOAuthGuard()
@ApiTags("DID")
export class DIDController {
  constructor(private readonly didService: DidService) {}

  @Get(".well-known/did.json")
  @ApiOperation({
    summary: "Retrieve DID document",
    description:
      "Retrieves the public DID document on the well-known address for this wallet",
  })
  @ApiOkResponse({ type: DIDDocumentDto })
  async getDid(): Promise<DIDDocument> {
    return await this.didService.getDid();
  }
}
