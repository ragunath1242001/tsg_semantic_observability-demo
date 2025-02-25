import {
  DataIntegrityProof,
  elementOrArray,
  JsonWebSignature2020,
  OrArray,
  Proof
} from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
  PartialType
} from "@nestjs/swagger";

export class ProofDocument {
  @ApiProperty(elementOrArray({ $ref: getSchemaPath(Proof) }))
  @Type(() => Proof)
  @IsDefined()
  @ValidateNested()
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
  proof!: OrArray<Proof>;
  [key: string]: any;
}

export class SignRequest {
  @ApiPropertyOptional({
    enum: ["JsonWebSignature2020", "DataIntegrityProof"],
    example: { type: "JsonWebSignature2020" }
  })
  @IsString()
  @IsOptional()
  @IsIn(["DataIntegrityProof", "JsonWebSignature2020"])
  type?: "JsonWebSignature2020" | "DataIntegrityProof";

  @ApiProperty({
    example: { id: "document1", content: "This is a sample document" }
  })
  @IsObject()
  @IsDefined()
  plainDocument!: Record<string, any>;

  @ApiPropertyOptional({
    example: "did:example:12345"
  })
  @IsString()
  @IsOptional()
  keyId?: string;

  @ApiPropertyOptional({
    enum: ["RDFC", "JCS"],
    default: "RDFC",
    example: "RDFC"
  })
  @IsString()
  @IsOptional()
  @IsIn(["RDFC", "JCS"])
  normalization: "RDFC" | "JCS" = "RDFC";

  @ApiPropertyOptional({
    default: "assertionMethod",
    example: "assertionMethod"
  })
  @IsString()
  @IsOptional()
  proofPurpose: string = "assertionMethod";

  @ApiPropertyOptional({
    type: PartialType(DataIntegrityProof),
    example: {
      created: "2023-10-12T18:25:43.511Z",
      proofPurpose: "assertionMethod"
    }
  })
  options: Partial<DataIntegrityProof> = {};

  @ApiPropertyOptional({
    default: false,
    example: false
  })
  @IsBoolean()
  @IsOptional()
  embeddedVerificationMethod: boolean = false;
}

export class ValidateRequest {
  @ApiPropertyOptional({
    type: ProofDocument,
    example: {
      proof: {
        type: "JsonWebSignature2020",
        created: "2023-10-12T18:25:43.511Z",
        proofPurpose: "assertionMethod",
        jws: "eyJ..."
      }
    }
  })
  @Type(() => ProofDocument)
  @ValidateNested()
  proofDocument?: ProofDocument;
}
