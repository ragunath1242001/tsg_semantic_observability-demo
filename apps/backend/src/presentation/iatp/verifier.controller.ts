import { Body, Controller, Post } from "@nestjs/common";
import { IatpVerifierService } from "./verifier.service.js";
import { AppRole } from "@libs/dtos";
import { Roles } from "../../auth/roles.guard.js";
import { PresentationDefinition } from "@libs/dtos";
import {
  VerifiablePresentation,
  VerifiableCredential,
  CredentialSubject,
} from "@tsg-dsp/common";
import { ApiBody, ApiOAuth2, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  VerifiablePresentationDto,
  VerificationRequestDto,
} from "../presentation.schema.js";

@Controller("iatp/verifier")
@ApiTags("Presentation IATP")
@ApiOAuth2([AppRole.VIEW_PRESENTATIONS])
@Roles(AppRole.VIEW_PRESENTATIONS)
export class IatpVerifierController {
  constructor(private readonly iatpVerifierService: IatpVerifierService) {}

  @Post("verify")
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
