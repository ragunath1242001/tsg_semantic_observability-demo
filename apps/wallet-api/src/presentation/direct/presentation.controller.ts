import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  ParseBoolPipe,
  Post,
  Query
} from "@nestjs/common";
import {
  ApiBody,
  ApiExtraModels,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath
} from "@nestjs/swagger";
import { AppError } from "@tsg-dsp/common-api";
import { nonEmptyStringPipe, Roles } from "@tsg-dsp/common-api";
import {
  PresentationValidation,
  VerifiablePresentationJsonLd,
  VerifiablePresentationJwt
} from "@tsg-dsp/common-dsp";
import { AppRole } from "@tsg-dsp/wallet-dtos";

import { PresentationService } from "../presentation.service.js";

@Controller("presentations")
@Roles(AppRole.VIEW_PRESENTATIONS)
@ApiOAuth2([AppRole.VIEW_PRESENTATIONS])
@ApiTags("Presentation Direct")
export class DirectPresentationController {
  constructor(private readonly presentationService: PresentationService) {}

  @Get()
  @ApiOperation({
    summary: "Request a presentation",
    description:
      "Generates a Veriable Presentation in Jwt or JSON-LD format for one of the credentials in this wallet"
  })
  @ApiExtraModels(VerifiablePresentationJwt, VerifiablePresentationJsonLd)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(VerifiablePresentationJwt) },
        { $ref: getSchemaPath(VerifiablePresentationJsonLd) }
      ]
    }
  })
  async createPresentation(
    @Query("credentialId", nonEmptyStringPipe) credentialId: string,
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
  @ApiOperation({
    summary: "Validate presentation",
    description:
      "Validates a Jwt-based Verifiable Presentation according to a fixed set of requirements"
  })
  @ApiBody({ type: VerifiablePresentationJwt })
  @ApiOkResponse({ type: PresentationValidation })
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
