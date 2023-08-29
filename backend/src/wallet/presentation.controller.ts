import { Body, Controller, DefaultValuePipe, Get, HttpStatus, ParseBoolPipe, Post, Query } from "@nestjs/common";
import { PresentationValidation, VerifiablePresentationJsonLd, VerifiablePresentationJwt } from "../model/credentials.dto.js";
import { AppError } from "../utils/error.js";
import { PresentationService } from "./presentation.service.js";
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "../model/clients.dto.js";

@Controller('presentations')
@Roles(AppRole.VIEW_PRESENTATIONS)
export class PresentationController {
  constructor(private readonly presentationService: PresentationService) {}

  @Get()
  async createPresentation(@Query('credentialId') credentialId: string, @Query('audience') audience: string | undefined, @Query('asJwt', new DefaultValuePipe(false), ParseBoolPipe) asJwt: boolean): Promise<VerifiablePresentationJsonLd | VerifiablePresentationJwt> {
    if (asJwt) {
      if (!audience) {
        throw new AppError(`Audience parameter required for JWT-based presentations`, HttpStatus.BAD_REQUEST);
      }
      return this.presentationService.createVerifiablePresentationJwt(credentialId, audience);
    } else {
      return this.presentationService.createVerifiablePresentationJsonLd(credentialId);
    }
  }

  @Post('validate')
  async validatePresentation(@Body() presentation: VerifiablePresentationJwt): Promise<PresentationValidation> {
    return this.presentationService.validatePresentation(presentation);
  }
}