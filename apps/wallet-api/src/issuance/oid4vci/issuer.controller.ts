import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath
} from "@nestjs/swagger";
import { DisableOAuthGuard } from "@tsg-dsp/common-api";
import {
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault
} from "@tsg-dsp/common-dtos";
import {
  AccessToken,
  CredentialIssuerMetadata,
  CredentialRequest,
  CredentialResponse,
  DeferredCredentialResponse,
  ImmediateCredentialResponse
} from "@tsg-dsp/wallet-dtos";

import { OID4VCIIssuerService } from "./issuer.service.js";

@Controller()
@ApiTags("OpenID 4 Verifiable Credential Issuance")
export class OID4VCIIssuerController {
  constructor(private readonly issuerService: OID4VCIIssuerService) {}

  @Get(".well-known/openid-credential-issuer")
  @DisableOAuthGuard()
  @ApiOkResponse({ type: CredentialIssuerMetadata })
  @HttpCode(HttpStatus.OK)
  async issuerMetadata(): Promise<CredentialIssuerMetadata> {
    return this.issuerService.issuerMetadata();
  }

  @Post("oid4vci/token")
  @ApiOperation({
    summary: "Request OID4VCI access token",
    description:
      "Requests an access token based on a pre authorizated code the holder has received off-line"
  })
  @DisableOAuthGuard()
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    schema: {
      type: "object",
      properties: { "pre-authorized_code": { type: "string" } }
    }
  })
  @ApiOkResponse({ type: AccessToken })
  @ApiForbiddenResponseDefault()
  @ApiNotFoundResponseDefault()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async tokenEndpoint(
    @Body("pre-authorized_code") preAuthorizedCode: string
  ): Promise<AccessToken> {
    return this.issuerService.createAccessToken(preAuthorizedCode);
  }

  @Post("oid4vci/credential")
  @ApiOperation({
    summary: "Request OID4VCI credential",
    description:
      "Requests a new credential based on a Credential Request via the OID4VCI flow"
  })
  @ApiBody({ type: CredentialRequest })
  @ApiExtraModels(ImmediateCredentialResponse, DeferredCredentialResponse)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(ImmediateCredentialResponse) },
        { $ref: getSchemaPath(DeferredCredentialResponse) }
      ]
    }
  })
  @ApiBearerAuth()
  @DisableOAuthGuard()
  @HttpCode(HttpStatus.OK)
  async credentialEndpoint(
    @Headers("Authorization") authorization: string,
    @Body() credentialRequest: CredentialRequest
  ): Promise<CredentialResponse> {
    return this.issuerService.handleCredentialRequest(
      authorization.substring(7),
      credentialRequest
    );
  }
}
