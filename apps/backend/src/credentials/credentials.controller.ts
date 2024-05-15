import { Controller, Get, Param } from "@nestjs/common";
import { CredentialsService } from "./credentials.service.js";
import { VerifiableCredential, CredentialSubject } from "@tsg-dsp/common";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";

@Controller()
@DisableOAuthGuard()
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get("credentials/:credentialId")
  async getCredential(
    @Param("credentialId") credentialId: string
  ): Promise<VerifiableCredential<CredentialSubject>> {
    return (await this.credentialsService.getCredential(credentialId))
      .credential;
  }
}
