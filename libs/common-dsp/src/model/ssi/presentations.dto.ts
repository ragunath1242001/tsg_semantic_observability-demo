import { Type } from "class-transformer";
import {
  IsString,
  IsOptional,
  ValidateNested,
  IsBoolean
} from "class-validator";
import {
  VerifiableCredential,
  DataIntegrityProof,
  JsonWebSignature2020,
  Proof
} from "./credentials.dto.js";
import { elementOrArray, OrArray } from "../../utils/unions.js";
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath
} from "@nestjs/swagger";

@ApiExtraModels(JsonWebSignature2020, DataIntegrityProof, VerifiableCredential)
export class VerifiablePresentation<
  T extends VerifiableCredential = VerifiableCredential,
  P extends Proof = Proof
> {
  @ApiProperty({ type: () => [String] })
  @IsString({ each: true })
  "@context": (
    | "https://www.w3.org/2018/credentials/v1"
    | "https://www.w3.org/ns/credentials/v2"
    | "https://w3id.org/security/suites/jws-2020/v1"
    | "https://w3id.org/security/data-integrity/v2"
    | string
  )[];
  @ApiProperty({ type: () => [String] })
  @IsString({ each: true })
  type!: string[];
  @ApiPropertyOptional()
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
    ]
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
  @ApiProperty()
  @IsBoolean()
  valid!: boolean;

  @ApiProperty()
  @IsBoolean()
  validateJWTSignature!: boolean;

  @ApiProperty()
  @IsBoolean()
  validateJWTExpiryDate!: boolean;

  @ApiProperty({ type: () => [Boolean] })
  @IsBoolean({ each: true })
  validTrustAnchors!: Array<boolean>;

  @ApiProperty({ type: () => [Boolean] })
  @IsBoolean({ each: true })
  validExpiryDate!: Array<boolean>;

  @ApiProperty({ type: () => [Boolean] })
  @IsBoolean({ each: true })
  validProof!: Array<boolean>;

  @ApiProperty({ type: () => [Boolean] })
  @IsBoolean({ each: true })
  validStatus!: Array<boolean>;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  validateAudience?: boolean;
}
