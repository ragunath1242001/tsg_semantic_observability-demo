import { Controller, Get, HttpCode, HttpStatus, Param } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath
} from "@nestjs/swagger";
import { DisableOAuthGuard } from "@tsg-dsp/common-api";
import { VerifiableCredential } from "@tsg-dsp/common-dsp";
import {
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault
} from "@tsg-dsp/common-dtos";

import { CredentialsDto } from "./credentials.schemas.js";
import { CredentialsService } from "./credentials.service.js";

@Controller()
@DisableOAuthGuard()
@ApiTags("Credentials")
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get("credentials")
  @ApiOperation({
    summary: "List dataspace credentials",
    description: "List all credentials in this dataspace."
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [CredentialsDto]
  })
  @ApiForbiddenResponseDefault()
  async getCredentials() {
    return await this.credentialsService.getCredentials(undefined);
  }

  @Get("credentials/:credentialId")
  @ApiOperation({
    summary: "Retrieve credential",
    description:
      "Retrieve a specific Verifiable Credential issued by this wallet"
  })
  @ApiOkResponse({
    schema: {
      oneOf: [{ $ref: getSchemaPath(VerifiableCredential) }, { type: "string" }]
    }
  })
  @ApiNotFoundResponseDefault()
  async getCredential(
    @Param("credentialId") credentialId: string
  ): Promise<VerifiableCredential | string> {
    return await this.credentialsService.getCredentialFormatted(credentialId);
  }
}
