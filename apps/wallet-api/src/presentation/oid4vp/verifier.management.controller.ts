import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  AppError,
  DisableOAuthGuard,
  DisableRolesGuard,
  Roles
} from "@tsg-dsp/common-api";
import {
  ApiForbiddenResponseDefault,
  PresentationDefinition
} from "@tsg-dsp/common-dtos";
import { AppRole } from "@tsg-dsp/wallet-dtos";

import { RuntimeConfig } from "../../config.js";
import { OID4VPVerifierService } from "./verifier.service.js";

@Controller("management/oid4vp/verifier")
@ApiTags("OID4VP")
@ApiOAuth2([AppRole.VIEW_PRESENTATIONS])
@Roles(AppRole.VIEW_PRESENTATIONS)
export class OID4VPVerifierManagementController {
  constructor(
    private readonly oid4vpVerifierService: OID4VPVerifierService,
    private readonly runtimeConfig: RuntimeConfig
  ) {}

  @Post("create")
  @ApiOperation({
    summary: "Add an Authorization Request",
    description:
      "Add an Authorization Request according to the OID4VP specification."
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: PresentationDefinition })
  @ApiOkResponse({ type: String })
  @ApiForbiddenResponseDefault()
  async create(
    @Body() presentationDefinition: PresentationDefinition
  ): Promise<string> {
    return this.oid4vpVerifierService.createAuthorizationRequest(
      presentationDefinition
    );
  }
  @Post("create/public")
  @ApiOperation({
    summary: "Add a public Authorization Request",
    description:
      "Add an Authorization Request according to the OID4VP specification, allowed for unauthenticated requests."
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: PresentationDefinition })
  @ApiOkResponse({ type: String })
  @DisableOAuthGuard()
  @DisableRolesGuard()
  @ApiForbiddenResponseDefault()
  async createPublic(
    @Body() presentationDefinition: PresentationDefinition
  ): Promise<string> {
    if (this.runtimeConfig.acceptUnauthenticatedCredentialRequests !== true) {
      throw new AppError(
        "This wallet does not accept unauthenticated credential requests",
        HttpStatus.FORBIDDEN
      );
    }
    return this.oid4vpVerifierService.createAuthorizationRequest(
      presentationDefinition
    );
  }
}
