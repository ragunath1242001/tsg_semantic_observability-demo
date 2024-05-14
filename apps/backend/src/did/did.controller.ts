import { Controller, Get, HttpStatus } from "@nestjs/common";
import { DIDDocument } from "did-resolver";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";
import { AppError } from "../utils/error.js";
import { DidService } from "./did.service.js";

@Controller()
@DisableOAuthGuard()
export class DIDController {
  constructor(private readonly didService: DidService) {}

  @Get(".well-known/did.json")
  async getDid(): Promise<DIDDocument> {
    return await this.didService.getDid();
  }
}
