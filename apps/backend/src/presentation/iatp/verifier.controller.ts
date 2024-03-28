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

@Controller("iatp/verifier")
@Roles(AppRole.VIEW_PRESENTATIONS)
export class IatpVerifierController {
  constructor(private readonly iatpVerifierService: IatpVerifierService) {}

  @Post("verify")
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
