import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Requires, validationPipe } from "@tsg-dsp/common-api";
import { toArray } from "@tsg-dsp/common-dsp";
import {
  Action,
  ApiBadRequestResponseDefault,
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault,
  ProofDocument,
  Resource,
  SignedJwtResponse,
  SignRequest,
  SignRequestJwt,
  ValidateJWTRequest,
  ValidateRequest
} from "@tsg-dsp/common-dtos";
import {
  validateDataIntegrityProof,
  validateJwt
} from "@tsg-dsp/common-signing-and-validation";
import { JWTPayload } from "jose";

import { SignatureService } from "./signature.service.js";

@Controller("management/signature")
@ApiTags("Management Signatures")
@Requires(Action.EXECUTE, Resource.W_KEY)
export class SignatureManagementController {
  constructor(private readonly signatureService: SignatureService) {}

  @Post("sign")
  @ApiOperation({
    summary: "Sign document",
    description: "Sign a JSON document with default or defined key"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: SignRequest })
  @ApiOkResponse({ type: ProofDocument })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async sign(
    @Body(validationPipe) signRequest: SignRequest
  ): Promise<ProofDocument> {
    const proof = await this.signatureService.signAsDataIntegrityProof(
      signRequest.normalization,
      signRequest.plainDocument,
      signRequest.keyId,
      signRequest.proofPurpose,
      signRequest.options,
      signRequest.embeddedVerificationMethod
    );
    return {
      ...signRequest.plainDocument,
      proof
    };
  }

  @Post("sign/jwt")
  @ApiOperation({
    summary: "Sign document as JWT",
    description: "Sign a JSON document as JWT with default or defined key"
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: SignRequestJwt })
  @ApiOkResponse({ type: SignedJwtResponse })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async signJwt(
    @Body(validationPipe) signRequest: SignRequestJwt
  ): Promise<SignedJwtResponse> {
    const jwt = await this.signatureService.signAsJwt(
      signRequest.body,
      signRequest.audience,
      {
        key: signRequest.keyId,
        expirationTime: signRequest.expirationTime
          ? new Date(signRequest.expirationTime)
          : undefined,
        subject: signRequest.subject,
        typ: signRequest.typ
      }
    );
    return {
      jwt
    };
  }

  @Post("validate")
  @ApiOperation({
    summary: "Validate signed document",
    description: "Validates a document that includes a `proof` property"
  })
  @ApiBody({ type: ValidateRequest })
  @ApiOkResponse({ type: ProofDocument })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @ApiBadRequestResponseDefault()
  async validate(
    @Body(validationPipe) validateRequest: ValidateRequest
  ): Promise<ProofDocument> {
    const { proof, ...plainDocument } = validateRequest.proofDocument!;
    await validateDataIntegrityProof(plainDocument, toArray(proof)[0]);
    return validateRequest.proofDocument!;
  }

  @Post("validate/jwt")
  @ApiOperation({
    summary: "Validate signed JWT",
    description: "Validates a signed JWT and returns the payload upon success"
  })
  @ApiBody({ type: ValidateJWTRequest })
  @ApiOkResponse({ type: Object })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  @ApiBadRequestResponseDefault()
  async validateJwt(
    @Body(validationPipe) validateRequest: ValidateJWTRequest
  ): Promise<JWTPayload> {
    return await validateJwt(validateRequest.jwt, {
      validateJti: validateRequest.jti
    });
  }
}
