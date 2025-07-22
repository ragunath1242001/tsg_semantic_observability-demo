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

import { elementOrArray, OrArray } from "../../utils/unions.js";
import {
  DataIntegrityProof,
  JsonWebSignature2020,
  Proof,
  VerifiableCredential
} from "./credentials.dto.js";

@ApiExtraModels(JsonWebSignature2020, DataIntegrityProof, VerifiableCredential)
export class VerifiablePresentation<
  T extends VerifiableCredential = VerifiableCredential,
  P extends Proof = Proof
> {
  @ApiProperty({
    type: () => [String],
    example: { "@context": "https://www.w3.org/ns/credentials/v2" }
  })
  @IsString({ each: true })
  "@context": (
    | "https://www.w3.org/2018/credentials/v1"
    | "https://www.w3.org/ns/credentials/v2"
    | "https://w3id.org/security/suites/jws-2020/v1"
    | "https://w3id.org/security/data-integrity/v2"
    | string
  )[];
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
  verifiableCredential!: OrArray<T>;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(JsonWebSignature2020) },
      { $ref: getSchemaPath(DataIntegrityProof) }
    ],
    example: { type: "JsonWebSignature2020" }
  })
  @ValidateNested()
  @IsOptional()
  @Type(() => Proof, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: JsonWebSignature2020, name: "JsonWebSignature2020" },
        { value: DataIntegrityProof, name: "DataIntegrityProof" }
      ]
    },
    keepDiscriminatorProperty: true
  })
  proof?: OrArray<P>;
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
