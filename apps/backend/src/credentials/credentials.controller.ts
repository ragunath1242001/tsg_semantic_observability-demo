import { Controller, Get, Param } from "@nestjs/common";
import { CredentialsService } from "./credentials.service.js";
import { VerifiableCredential, CredentialSubject } from "@tsg-dsp/common";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";
import { ApiOkResponse, ApiNotFoundResponse, ApiTags } from "@nestjs/swagger";
import { CredentialsDto } from "./credentials.schemas.js";

@Controller()
@DisableOAuthGuard()
@ApiTags("Credentials")
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get("credentials/:credentialId")
  @ApiOkResponse({ type: CredentialsDto })
  @ApiNotFoundResponse()
  async getCredential(
    @Param("credentialId") credentialId: string
  ): Promise<VerifiableCredential<CredentialSubject>> {
    return (await this.credentialsService.getCredential(credentialId))
      .credential;
  }
}
