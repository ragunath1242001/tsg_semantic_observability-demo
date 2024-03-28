import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  ParseBoolPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  PresentationValidation,
  VerifiablePresentationJsonLd,
  VerifiablePresentationJwt,
} from "@tsg-dsp/common";
import { AppError } from "../../utils/error.js";
import { PresentationService } from "../presentation.service.js";
import { Roles } from "../../auth/roles.guard.js";
import { AppRole } from "@libs/dtos";

@Controller("presentations")
@Roles(AppRole.VIEW_PRESENTATIONS)
export class DirectPresentationController {
  constructor(private readonly presentationService: PresentationService) {}

  @Get()
  async createPresentation(
    @Query("credentialId") credentialId: string,
    @Query("audience") audience: string | undefined,
    @Query("asJwt", new DefaultValuePipe(false), ParseBoolPipe) asJwt: boolean,
    @Query("unwrap", new DefaultValuePipe(true), ParseBoolPipe) unwrap: boolean
  ): Promise<VerifiablePresentationJsonLd | VerifiablePresentationJwt> {
    if (asJwt) {
      if (!audience) {
        throw new AppError(
          `Audience parameter required for JWT-based presentations`,
          HttpStatus.BAD_REQUEST
        );
      }
      return this.presentationService.createVerifiablePresentationJwt(
        credentialId,
        audience,
        unwrap
      );
    } else {
      return this.presentationService.createVerifiablePresentationJsonLd(
        credentialId,
        unwrap
      );
    }
  }

  @Post("validate")
  async validatePresentation(
    @Body() presentation: VerifiablePresentationJwt,
    @Query("audience") audience: string | undefined
  ): Promise<PresentationValidation> {
    return this.presentationService.validatePresentation(
      presentation,
      audience
    );
  }
}
