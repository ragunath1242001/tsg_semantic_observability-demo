import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query
} from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";
import {
  AppError,
  DisableOAuthGuard,
  DisableRolesGuard,
  Paginated,
  PaginationOptionsDto,
  PaginationQuery,
  Roles,
  UsePagination,
  validationPipe
} from "@tsg-dsp/common-api";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";
import {
  AppRole,
  CredentialOffer,
  CredentialOfferRequest,
  CredentialOfferStatus,
  DCPCredentialRequestInitiation,
  OID4VCICredentialRequestInitiation
} from "@tsg-dsp/wallet-dtos";

import { RuntimeConfig } from "../config.js";
import { CredentialsDto } from "../credentials/credentials.schemas.js";
import { IssuanceService } from "./issuance.service.js";

@Controller("management/issuance")
@ApiTags("Issuance Management")
@Roles(AppRole.MANAGE_ALL_CREDENTIALS)
export class IssuanceManagementController {
  constructor(
    private readonly issuanceService: IssuanceService,
    private readonly runtimeConfig: RuntimeConfig
  ) {}

  @Post("request/dcp")
  @ApiOperation({
    summary: "Request credential via DCP",
    description:
      "Requests a new credential via the Decentralized Claims Protocol"
  })
  @ApiBody({ type: DCPCredentialRequestInitiation })
  @ApiOkResponse()
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  async requestDCPCredential(
    @Body(validationPipe) request: DCPCredentialRequestInitiation
  ): Promise<void> {
    return this.issuanceService.requestDCPCredential(request);
  }

  @Post("request/oid4vci")
  @ApiOperation({
    summary: "Request credential via OID4VCI",
    description:
      "Requests a new credential via the OpenID 4 Verifiable Credential Issuance protocol."
  })
  @ApiBody({ type: OID4VCICredentialRequestInitiation })
  @ApiOkResponse({ type: CredentialsDto })
  @ApiForbiddenResponseDefault()
  @HttpCode(HttpStatus.OK)
  async requestOID4VCICredential(
    @Body(validationPipe) request: OID4VCICredentialRequestInitiation
  ): Promise<CredentialsDto> {
    return this.issuanceService.requestOID4VCICredential(request);
  }

  @Get("offers")
  @UsePagination()
  @ApiOperation({
    summary: "Retrieve offered credentials",
    description:
      "Retrieves all credentials offered this wallet has offered to holders"
  })
  @ApiOkResponse({ type: [CredentialOfferStatus] })
  @ApiForbiddenResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS])
  @HttpCode(HttpStatus.OK)
  async listOffers(
    @PaginationQuery() paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<CredentialOfferStatus[]>> {
    return this.issuanceService.credentialOfferStatus(paginationOptions);
  }

  @Get("offers/:id")
  @ApiOperation({
    summary: "Retrieve offered credential",
    description: "Retrieves a specific credential offer"
  })
  @ApiParam({ name: "id", required: true, type: String })
  @DisableOAuthGuard()
  @DisableRolesGuard()
  @ApiOkResponse({ type: [CredentialOfferStatus] })
  @HttpCode(HttpStatus.OK)
  async listGeneralOffers(
    @Param("id") id: string
  ): Promise<CredentialOfferStatus> {
    return this.issuanceService.credentialOfferById(id);
  }

  @Post("offers")
  @ApiOperation({
    summary: "Add offer",
    description: "Creates a new credential offer"
  })
  @Roles(AppRole.MANAGE_ALL_CREDENTIALS)
  @ApiBody({ type: CredentialOffer })
  @ApiOkResponse({ type: CredentialOfferStatus })
  @ApiQuery({
    name: "mobile",
    required: false,
    default: true,
    example: true,
    description: "Whether the offer is for mobile or server applications"
  })
  @HttpCode(HttpStatus.OK)
  async offerEndpoint(
    @Body() offerRequest: CredentialOfferRequest,
    @Query("mobile") mobile: boolean = true
  ): Promise<CredentialOffer> {
    return this.issuanceService.createCredentialOffer(offerRequest, mobile);
  }

  @Post("offers/public")
  @ApiOperation({
    summary: "Add public offer",
    description:
      "Creates a new credential offer, allowed for unauthenticated requests"
  })
  @ApiBody({ type: CredentialOffer })
  @ApiOkResponse({ type: CredentialOfferStatus })
  @ApiQuery({
    name: "mobile",
    required: false,
    default: true,
    example: true,
    description: "Whether the offer is for mobile or server applications"
  })
  @DisableOAuthGuard()
  @DisableRolesGuard()
  @HttpCode(HttpStatus.OK)
  async publicOfferEndpoint(
    @Body() offerRequest: CredentialOfferRequest,
    @Query("mobile") mobile: boolean = true
  ): Promise<CredentialOffer> {
    if (this.runtimeConfig.acceptUnauthenticatedCredentialRequests !== true) {
      throw new AppError(
        "This wallet does not accept unauthenticated credential requests",
        HttpStatus.FORBIDDEN
      );
    }
    return this.issuanceService.createCredentialOffer(offerRequest, mobile);
  }

  @Put("offers/:id/revoke")
  @ApiOperation({
    summary: "Revoke offer",
    description:
      "Revokes an existing credential offer, so that it cannot be used anymore by the holder"
  })
  @ApiParam({ name: "id", required: true, type: String })
  @Roles(AppRole.MANAGE_ALL_CREDENTIALS)
  @ApiOkResponse({ type: CredentialOfferStatus })
  @ApiForbiddenResponseDefault()
  @ApiOAuth2([AppRole.MANAGE_ALL_CREDENTIALS])
  @HttpCode(HttpStatus.OK)
  async revokeOffer(@Param("id") id: string): Promise<CredentialOfferStatus> {
    return this.issuanceService.revokeOffer(id);
  }
}
