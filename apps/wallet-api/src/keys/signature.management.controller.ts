import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AppRole } from "@tsg-dsp/wallet-dtos";
import {
  ProofDocument,
  SignRequest,
  ValidateRequest
} from "@tsg-dsp/common-dtos";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import {
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault
} from "@tsg-dsp/common-dtos";
import { SignatureService } from "./signature.service.js";
import { toArray } from "@tsg-dsp/common-dsp";
import { Roles, validationPipe } from "@tsg-dsp/common-api";

@Controller("management/signature")
@ApiTags("Management Signatures")
@ApiOAuth2([AppRole.USE_KEYS, AppRole.MANAGE_KEYS])
@Roles([AppRole.USE_KEYS, AppRole.MANAGE_KEYS])
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
    const proof = await this.signatureService.signAsProof(
      signRequest.plainDocument,
      signRequest.keyId,
      signRequest.type,
      signRequest.normalization,
      signRequest.proofPurpose,
      signRequest.options,
      signRequest.embeddedVerificationMethod
    );
    return {
      ...signRequest.plainDocument,
      proof
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
  async validate(
    @Body(validationPipe) validateRequest: ValidateRequest
  ): Promise<ProofDocument> {
    const { proof, ...plainDocument } = validateRequest.proofDocument!;
    await this.signatureService.validateProof(plainDocument, toArray(proof)[0]);
    return validateRequest.proofDocument!;
  }
}
