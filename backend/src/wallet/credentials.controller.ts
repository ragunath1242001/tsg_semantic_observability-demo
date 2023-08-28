import { Controller, Get, HttpStatus, Param } from "@nestjs/common";
import { CredentialsService } from "./credentials.service.js";
import { DIDDocument } from "did-resolver";
import { VerifiableCredential, CredentialSubject } from "../model/credentials.dto.js";
import { AppError } from "../utils/error.js";
import { DidService } from "./did.service.js";
import { DisableJwtGuard } from "../auth/jwt.guard.js";

@Controller()
@DisableJwtGuard(true)
export class CredentialsController {
  constructor(
    private readonly didService: DidService,
    private readonly credentialsService: CredentialsService,
  ) {}

  @Get('.well-known/did.json')
  async getDid(): Promise<DIDDocument> {
    const didDocument = await this.didService.getDid();
    if (didDocument === undefined) {
      throw new AppError(`DID Document not ready yet`, HttpStatus.NOT_FOUND);
    }
    return didDocument;
  }

  @Get('credentials/:credentialId')
  async getCredential(@Param('credentialId') credentialId: string): Promise<VerifiableCredential<CredentialSubject>> {
    return (await this.credentialsService.getCredential(credentialId)).credential;
  }
}