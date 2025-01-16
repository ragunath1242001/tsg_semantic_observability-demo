import {
  Body,
  Controller,
  Post,
  Headers,
  Get,
  Param,
  Put,
  HttpCode,
  HttpStatus
} from "@nestjs/common";
import { IssuerService } from "./issuer.service.js";
import {
  AccessToken,
  CredentialIssuerMetadata,
  CredentialOffer,
  CredentialOfferRequest,
  CredentialOfferStatus,
  CredentialRequest,
  CredentialResponse,
  DeferredCredentialResponse,
  ImmediateCredentialResponse
} from "@tsg-dsp/wallet-dtos";
import { AppRole } from "@tsg-dsp/wallet-dtos";
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath
} from "@nestjs/swagger";
import {
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault
} from "@tsg-dsp/common-dtos";
import { DisableOAuthGuard, Roles } from "@tsg-dsp/common-api";

@Controller()
@ApiTags("OpenID 4 Verifiable Credential Issuance")
export class IssuerController {
  constructor(private readonly issuerService: IssuerService) {}

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

  @Get("oid4vci/offer")
  @ApiOperation({
    summary: "Retrieve offered credentials",
    description:
      "Retrieves all credentials offered this wallet has offered to holders"
  })
  @Roles(AppRole.MANAGE_ALL_CREDENTIALS)
  @ApiOkResponse({ type: [CredentialOfferStatus] })
  @ApiForbiddenResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS])
  @HttpCode(HttpStatus.OK)
  async listOffers(): Promise<CredentialOfferStatus[]> {
    return this.issuerService.credentialOfferStatus();
  }

  @Post("oid4vci/offer")
  @ApiOperation({
    summary: "Add offer",
    description: "Creates a new credential offer"
  })
  @Roles(AppRole.MANAGE_ALL_CREDENTIALS)
  @ApiBody({ type: CredentialOffer })
  @ApiOkResponse({ type: CredentialOfferStatus })
  @ApiForbiddenResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS])
  @HttpCode(HttpStatus.OK)
  async offerEndpoint(
    @Body() offerRequest: CredentialOfferRequest
  ): Promise<CredentialOffer> {
    return this.issuerService.createCredentialOffer(offerRequest);
  }

  @Put("oid4vci/offer/:id/revoke")
  @ApiOperation({
    summary: "Revoke offer",
    description:
      "Revokes an existing credential offer, so that it cannot be used anymore by the holder"
  })
  @Roles(AppRole.MANAGE_ALL_CREDENTIALS)
  @ApiOkResponse({ type: CredentialOfferStatus })
  @ApiForbiddenResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS])
  @HttpCode(HttpStatus.OK)
  async revokeOffer(@Param("id") id: number): Promise<CredentialOfferStatus> {
    return this.issuerService.revokeOffer(id);
  }
}
