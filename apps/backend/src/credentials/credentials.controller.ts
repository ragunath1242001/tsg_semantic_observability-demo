import { Controller, Get, Param } from "@nestjs/common";
import { CredentialsService } from "./credentials.service.js";
import { VerifiableCredential, CredentialSubject } from "@tsg-dsp/common";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CredentialsDto } from "./credentials.schemas.js";
import { ApiNotFoundResponseDefault } from "../utils/swagger.js";

@Controller()
@DisableOAuthGuard()
@ApiTags("Credentials")
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get("credentials/:credentialId")
  @ApiOperation({
    summary: "Retrieve credential",
    description:
      "Retrieve a specific Verifiable Credential issued by this wallet",
  })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiNotFoundResponseDefault()
  async getCredential(
    @Param("credentialId") credentialId: string
  ): Promise<VerifiableCredential<CredentialSubject>> {
    return (await this.credentialsService.getCredential(credentialId))
      .credential;
  }
}
