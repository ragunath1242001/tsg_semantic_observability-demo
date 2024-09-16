import {
  JsonWebSignature,
  SignRequest,
  ValidateRequest,
} from "@tsg-dsp/common-dtos";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SignatureDto } from "../credentials/credentials.schemas.js";

export class SignRequestDto implements SignRequest {
  @ApiProperty()
  type!: "JsonWebSignature";
  @ApiProperty()
  plainDocument!: Record<string, any>;
  @ApiPropertyOptional()
  keyId?: string;
}

export class ValidateRequestDto implements ValidateRequest {
  @ApiProperty()
  type!: "JsonWebSignature";
  @ApiPropertyOptional()
  jsonWebSignature?: JsonWebSignature;
}

export class JsonWebSignatureDto implements JsonWebSignature {
  @ApiProperty()
  proof!: SignatureDto;
  [key: string]: any;
}
