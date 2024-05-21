import {
  Body,
  Controller,
  Post,
  Headers,
  Get,
  Param,
  Put,
  HttpCode,
  HttpStatus,
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
} from "@libs/dtos";
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "@libs/dtos";
import { DisableOAuthGuard } from "../auth/oauth.guard.js";
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOAuth2,
  ApiOkResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  AccessTokenDto,
  CredentialIssuerMetadataDto,
  CredentialOfferDto,
  CredentialOfferStatusDto,
  CredentialRequestDto,
  DeferredCredentialResponseDto,
  ImmediateCredentialResponseDto,
} from "./issuance.schemas.js";

@Controller()
@ApiTags("OpenID 4 Verifiable Credential Issuance")
export class IssuerController {
  constructor(private readonly issuerService: IssuerService) {}

  @Get(".well-known/openid-credential-issuer")
  @DisableOAuthGuard()
  @ApiOkResponse({ type: CredentialIssuerMetadataDto })
  @HttpCode(HttpStatus.OK)
  async issuerMetadata(): Promise<CredentialIssuerMetadata> {
    return this.issuerService.issuerMetadata();
  }

  @Post("oid4vci/token")
  @DisableOAuthGuard()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AccessTokenDto })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async tokenEndpoint(
    @Body("pre-authorized_code") preAuthorizedCode: string
  ): Promise<AccessToken> {
    return this.issuerService.createAccessToken(preAuthorizedCode);
  }

  @Post("oid4vci/credential")
  @ApiBody({ type: CredentialRequestDto })
  @ApiExtraModels(ImmediateCredentialResponseDto, DeferredCredentialResponseDto)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(ImmediateCredentialResponseDto) },
        { $ref: getSchemaPath(DeferredCredentialResponseDto) },
      ],
    },
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
  @Roles(AppRole.MANAGE_ALL_CREDENTIALS)
  @ApiOkResponse({ type: [CredentialOfferStatusDto] })
  @ApiForbiddenResponse()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS])
  @HttpCode(HttpStatus.OK)
  async listOffers(): Promise<CredentialOfferStatus[]> {
    return this.issuerService.credentialOfferStatus();
  }

  @Post("oid4vci/offer")
  @Roles(AppRole.MANAGE_ALL_CREDENTIALS)
  @ApiBody({ type: CredentialOfferDto })
  @ApiOkResponse({ type: CredentialOfferStatusDto })
  @ApiForbiddenResponse()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS])
  @HttpCode(HttpStatus.OK)
  async offerEndpoint(
    @Body() offerRequest: CredentialOfferRequest
  ): Promise<CredentialOffer> {
    return this.issuerService.createCredentialOffer(offerRequest);
  }

  @Put("oid4vci/offer/:id/revoke")
  @Roles(AppRole.MANAGE_ALL_CREDENTIALS)
  @ApiOkResponse({ type: CredentialOfferStatusDto })
  @ApiForbiddenResponse()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS])
  @HttpCode(HttpStatus.OK)
  async revokeOffer(@Param("id") id: number): Promise<CredentialOfferStatus> {
    return this.issuerService.revokeOffer(id);
  }
}
