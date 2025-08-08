import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import { elementOrArray, OrArray, toArray } from "../../utils/unions.js";
import {
  DataIntegrityProof,
  EnvelopedVerifiableCredential,
  VerifiableCredential
} from "./credentials.dto.js";

@ApiExtraModels(VerifiableCredential)
export class VerifiablePresentation<
  T extends VerifiableCredential = VerifiableCredential
> {
  @ApiProperty({
    type: () => [String],
    example: { "@context": "https://www.w3.org/ns/credentials/v2" }
  })
  @IsString({ each: true })
  "@context": ("https://www.w3.org/ns/credentials/v2" | string)[];
  @ApiProperty({ type: () => [String], example: ["VerifiablePresentation"] })
  @IsString({ each: true })
  type!: string[];
  @ApiPropertyOptional({ example: "3f2592da-ffc9-40cb-a336-a9daa9343ce8" })
  @IsString()
  @IsOptional()
  id?: string;
  @ApiProperty(elementOrArray({ $ref: getSchemaPath(VerifiableCredential) }))
  @ValidateNested()
  @Type(() => VerifiableCredential)
  verifiableCredential!: OrArray<T | EnvelopedVerifiableCredential>;

  @ApiProperty({
    type: () => [DataIntegrityProof]
  })
  @ValidateNested()
  @IsOptional()
  @Type(() => DataIntegrityProof)
  proof?: OrArray<DataIntegrityProof>;
}

export class EnvelopedVerifiablePresentation {
  @ApiProperty({
    type: [String],
    items: { enum: ["https://www.w3.org/ns/credentials/v2"] }
  })
  "@context": ["https://www.w3.org/ns/credentials/v2"];
  @ApiProperty({ type: String, example: "data:application/vp+jwt,..." })
  @IsString()
  id!: string;
  @ApiProperty({
    type: [String],
    items: { enum: ["EnvelopedVerifiablePresentation"] }
  })
  type!: ["EnvelopedVerifiablePresentation"];
}

export function isEnvelopedVerifiablePresentation(
  presentation: VerifiablePresentation | EnvelopedVerifiablePresentation
): presentation is EnvelopedVerifiablePresentation {
  return (
    Array.isArray(presentation["@context"]) &&
    presentation["@context"].includes("https://www.w3.org/ns/credentials/v2") &&
    toArray(presentation.type).includes("EnvelopedVerifiablePresentation")
  );
}

export class VerifiableCredentialJwt {
  @ApiProperty()
  @IsString()
  vc!: string;
}

export class VerifiablePresentationJwt {
  @ApiProperty()
  @IsString()
  vp!: string;
}

export class VerifiablePresentationJsonLd {
  @ApiProperty({ type: () => VerifiablePresentation })
  @ValidateNested()
  @Type(() => VerifiablePresentation)
  vp!: VerifiablePresentation;
}

export class PresentationValidation extends VerifiablePresentationJwt {
  @ApiProperty({ example: true })
  @IsBoolean()
  valid!: boolean;

  @ApiProperty({ type: () => VerifiablePresentation })
  @ValidateNested()
  @Type(() => VerifiablePresentation)
  presentation!: VerifiablePresentation;

  @ApiProperty({ example: true })
  @IsBoolean()
  validateJWTSignature!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  validateJWTExpiryDate!: boolean;

  @ApiProperty({ type: () => [Boolean], example: [true] })
  @IsBoolean({ each: true })
  validTrustAnchors!: Array<boolean>;

  @ApiProperty({ type: () => [Boolean], example: [true] })
  @IsBoolean({ each: true })
  validExpiryDate!: Array<boolean>;

  @ApiProperty({ type: () => [Boolean], example: [true] })
  @IsBoolean({ each: true })
  validProof!: Array<boolean>;

  @ApiProperty({ type: () => [Boolean], example: [true] })
  @IsBoolean({ each: true })
  validStatus!: Array<boolean>;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  validateAudience?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  validateNonce?: boolean;
}
