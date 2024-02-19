import { Body, Controller, Post, Headers, Get } from "@nestjs/common";
import { IssuerService } from "./issuer.service.js";
import { AccessToken, CredentialIssuerMetadata, CredentialOffer, CredentialOfferRequest, CredentialRequest, CredentialResponse } from "../model/issuance.dto.js";
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "../model/clients.dto.js";
import { DisableJwtGuard } from "../auth/jwt.guard.js";


@Controller()
export class IssuerController {
  constructor(
    private readonly issuerService: IssuerService
  ){}

  @Get('.well-known/openid-credential-issuer')
  @DisableJwtGuard(true)
  async issuerMetadata(): Promise<CredentialIssuerMetadata> {
    return this.issuerService.issuerMetadata();
  }

  @Post('oid4vci/token')
  @DisableJwtGuard(true)
  async tokenEndpoint(@Body('pre-authorized_code') preAuthorizedCode: string): Promise<AccessToken> {
    return this.issuerService.createAccessToken(preAuthorizedCode);
  }

  @Post('oid4vci/credential')
  @DisableJwtGuard(true)
  async credentialEndpoint(@Headers('Authorization') authorization: string, @Body() credentialRequest: CredentialRequest): Promise<CredentialResponse> {
    return this.issuerService.handleCredentialRequest(authorization.substring(7), credentialRequest);
  }

  @Post('oid4vci/offer')
  @Roles(AppRole.MANAGE_ALL_CREDENTIALS)
  async offerEndpoint(@Body() offerRequest: CredentialOfferRequest): Promise<CredentialOffer> {
    return this.issuerService.createCredentialOffer(offerRequest);
  }
}