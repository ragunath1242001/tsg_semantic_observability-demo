import {
  ProofDocument,
  SignRequest,
  ValidateRequest,
} from "@tsg-dsp/common-dtos";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { JsonWebSignature2020Dto } from "../credentials/credentials.schemas.js";
import { DataIntegrityProof } from "@tsg-dsp/common-dsp";

export class SignRequestDto implements SignRequest {
  @ApiPropertyOptional()
  type?: "JsonWebSignature2020" | "DataIntegrityProof";
  @ApiProperty()
  plainDocument!: Record<string, any>;
  @ApiPropertyOptional()
  keyId?: string;
  @ApiPropertyOptional()
  normalization: "RDFC" | "JCS" = "RDFC";
  @ApiPropertyOptional()
  proofPurpose: string = "assertionMethod";
  @ApiPropertyOptional()
  options: Partial<DataIntegrityProof> = {};
  @ApiPropertyOptional()
  embeddedVerificationMethod: boolean = false;
}

export class ValidateRequestDto implements ValidateRequest {
  @ApiPropertyOptional()
  proofDocument?: ProofDocument;
}

export class JsonWebSignatureDto implements ProofDocument {
  @ApiProperty()
  proof!: JsonWebSignature2020Dto;
  [key: string]: any;
}
