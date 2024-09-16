import { Body, Controller, Post } from "@nestjs/common";
import { IatpVerifierService } from "./verifier.service.js";
import { AppRole } from "@tsg-dsp/wallet-dtos";
import { Roles } from "../../auth/roles.guard.js";
import { PresentationDefinition } from "@tsg-dsp/common-dtos";
import {
  VerifiablePresentation,
  VerifiableCredential,
  CredentialSubject,
} from "@tsg-dsp/common-dsp";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  VerifiablePresentationDto,
  VerificationRequestDto,
} from "../presentation.schemas.js";

@Controller("iatp/verifier")
@ApiTags("Presentation IATP")
@ApiOAuth2([AppRole.VIEW_PRESENTATIONS])
@Roles(AppRole.VIEW_PRESENTATIONS)
export class IatpVerifierController {
  constructor(private readonly iatpVerifierService: IatpVerifierService) {}

  @Post("verify")
  @ApiOperation({
    summary: "Start verification flow",
    description:
      "Request a new IATP presentation flow to start as verifier, based on a presentation defintion and a holder SIOP token",
  })
  @ApiBody({ type: VerificationRequestDto })
  @ApiOkResponse({ type: VerifiablePresentationDto })
  async verify(
    @Body()
    verificationRequest: {
      presentationDefinition: PresentationDefinition;
      holderIdToken: string;
    }
  ): Promise<VerifiablePresentation<VerifiableCredential<CredentialSubject>>> {
    return this.iatpVerifierService.verify(
      verificationRequest.holderIdToken,
      verificationRequest.presentationDefinition
    );
  }
}
