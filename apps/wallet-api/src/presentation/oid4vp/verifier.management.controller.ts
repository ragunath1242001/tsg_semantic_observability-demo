import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { Roles } from "@tsg-dsp/common-api";
import { AppRole } from "@tsg-dsp/wallet-dtos";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiForbiddenResponseDefault,
  PresentationDefinition,
  AuthorizationRequest
} from "@tsg-dsp/common-dtos";
import { OID4VPVerifierService } from "./verifier.service.js";

@Controller("management/oid4vp/verifier")
@ApiTags("OID4VP")
@ApiOAuth2([AppRole.VIEW_PRESENTATIONS])
@Roles(AppRole.VIEW_PRESENTATIONS)
export class OID4VPVerifierManagementController {
  constructor(private readonly oid4vpVerifierService: OID4VPVerifierService) {}

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
  async status(
    @Body() presentationDefinition: PresentationDefinition
  ): Promise<string> {
    return this.oid4vpVerifierService.createAuthorizationRequest(
      presentationDefinition
    );
  }
}
