import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Roles } from "../auth/roles.guard.js";
import { AppRole } from "@tsg-dsp/wallet-dtos";
import {
  JsonWebSignature,
  SignRequest,
  ValidateRequest,
} from "@tsg-dsp/common-dtos";
import { validationPipe } from "../utils/validation.pipe.js";
import {
  ApiBody,
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiForbiddenResponseDefault,
  ApiNotFoundResponseDefault,
} from "../utils/swagger.js";
import {
  JsonWebSignatureDto,
  SignRequestDto,
  ValidateRequestDto,
} from "./signature.schemas.js";
import { SignatureService } from "./signature.service.js";

@Controller("management/signature")
@ApiTags("Management Signatures")
@ApiOAuth2([AppRole.USE_KEYS, AppRole.MANAGE_KEYS])
@Roles([AppRole.USE_KEYS, AppRole.MANAGE_KEYS])
export class SignatureManagementController {
  constructor(private readonly signatureService: SignatureService) {}

  @Post("sign")
  @ApiOperation({
    summary: "Sign document",
    description: "Sign a JSON document with default or defined key",
  })
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: SignRequestDto })
  @ApiOkResponse({ type: JsonWebSignatureDto })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async sign(
    @Body(validationPipe) signRequest: SignRequest
  ): Promise<JsonWebSignature> {
    const proof = await this.signatureService.signAsJsonWebSignature(
      signRequest.plainDocument,
      signRequest.keyId
    );
    return {
      ...signRequest.plainDocument,
      proof,
    };
  }

  @Post("validate")
  @ApiOperation({
    summary: "Validate signed document",
    description: "Validates a document that includes a `proof` property",
  })
  @ApiBody({ type: ValidateRequestDto })
  @ApiOkResponse({ type: JsonWebSignatureDto })
  @ApiNotFoundResponseDefault()
  @ApiForbiddenResponseDefault()
  async validate(
    @Body(validationPipe) validateRequest: ValidateRequest
  ): Promise<JsonWebSignature> {
    const { proof, ...plainDocument } = validateRequest.jsonWebSignature!;
    await this.signatureService.validateJsonWebSignature(plainDocument, proof);
    return validateRequest.jsonWebSignature!;
  }
}
