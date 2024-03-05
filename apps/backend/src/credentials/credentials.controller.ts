import { Controller, Get, HttpStatus, Logger, Param } from "@nestjs/common";
import { CredentialsService } from "./credentials.service.js";
import { DIDDocument } from "did-resolver";
import { VerifiableCredential, CredentialSubject } from "@tsg-dsp/common";
import { AppError } from "../utils/error.js";
import { DidService } from "../did/did.service.js";
import { DisableJwtGuard } from "../auth/jwt.guard.js";
import { RootConfig } from "../config.js";

@Controller()
@DisableJwtGuard(true)
export class CredentialsController {
  constructor(
    private readonly didService: DidService,
    private readonly credentialsService: CredentialsService,
    private readonly config: RootConfig
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get('.well-known/did.json')
  async getDid(): Promise<DIDDocument> {
    const didDocument = await this.didService.getDid();
    if (didDocument === undefined) {
      throw new AppError(`DID Document not ready yet`, HttpStatus.NOT_FOUND);
    }
    return didDocument;
  }

  @Get('context/:id')
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async getContext(@Param('id') id: string): Promise<Record<string, any>> {
    const context = this.config.contexts.find(context => context.id === id);
    if (!context) {
      throw new AppError(`JSON LD context with identifier ${id} not found`, HttpStatus.NOT_FOUND).andLog(this.logger, 'log');
    }
    if (context.documentUrl) {
      throw new AppError(`JSON LD context with identifier ${id} is not defined here, location: ${context.document}`, HttpStatus.NOT_FOUND).andLog(this.logger, 'log');
    }
    if (context.document) {
      return context.document;
    }
    throw new AppError(`No document or documentUrl configured for context ${id}`, HttpStatus.INTERNAL_SERVER_ERROR).andLog(this.logger);
  }

  @Get('credentials/:credentialId')
  async getCredential(@Param('credentialId') credentialId: string): Promise<VerifiableCredential<CredentialSubject>> {
    return (await this.credentialsService.getCredential(credentialId)).credential;
  }
}