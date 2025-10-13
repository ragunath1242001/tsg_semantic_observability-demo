import { Body, Controller, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { Roles, validationPipe } from "@tsg-dsp/common-api";
import { VerifiablePresentation } from "@tsg-dsp/common-dsp";
import { VerificationRequest } from "@tsg-dsp/common-dtos";
import { AppRole } from "@tsg-dsp/wallet-dtos";

import { DCPVerifierService } from "./verifier.service.js";

@Controller("management/dcp/verifier")
@ApiTags("Presentation DCP")
@ApiOAuth2([AppRole.VIEW_PRESENTATIONS])
@Roles(AppRole.VIEW_PRESENTATIONS)
export class DCPVerifierManagementController {
  constructor(private readonly dcpVerifierService: DCPVerifierService) {}

  @Post("verify")
  @ApiOperation({
    summary: "Start verification flow",
    description:
      "Request a new DCP presentation flow to start as verifier, based on a presentation defintion and a holder SIOP token"
  })
  @ApiBody({ type: VerificationRequest })
  @ApiOkResponse({ type: [VerifiablePresentation] })
  async verify(
    @Body(validationPipe)
    verificationRequest: VerificationRequest
  ): Promise<VerifiablePresentation[]> {
    return this.dcpVerifierService.verify(verificationRequest);
  }
}
