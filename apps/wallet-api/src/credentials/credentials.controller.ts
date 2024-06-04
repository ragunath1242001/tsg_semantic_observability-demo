import { Controller, Get, HttpCode, HttpStatus, Param } from "@nestjs/common";
import { CredentialsService } from "./credentials.service.js";
import { VerifiableCredential, CredentialSubject } from "@tsg-dsp/common";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CredentialsDto } from "./credentials.schemas.js";
import {
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault,
} from "../utils/swagger.js";

@Controller()
@DisableOAuthGuard()
@ApiTags("Credentials")
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get("credentials")
  @ApiOperation({
    summary: "List dataspace credentials",
    description: "List all credentials in this dataspace.",
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [CredentialsDto],
  })
  @ApiForbiddenResponseDefault()
  async getCredentials() {
    return await this.credentialsService.getCredentials(undefined);
  }

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
