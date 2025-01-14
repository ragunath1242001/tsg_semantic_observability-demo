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
    enum: ["JsonWebSignature2020", "DataIntegrityProof"]
  })
  @IsString()
  @IsOptional()
  @IsIn(["DataIntegrityProof", "JsonWebSignature2020"])
  type?: "JsonWebSignature2020" | "DataIntegrityProof";

  @ApiProperty()
  @IsObject()
  @IsDefined()
  plainDocument!: Record<string, any>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  keyId?: string;

  @ApiPropertyOptional({
    enum: ["RDFC", "JCS"],
    default: "RDFC"
  })
  @IsString()
  @IsOptional()
  @IsIn(["RDFC", "JCS"])
  normalization: "RDFC" | "JCS" = "RDFC";

  @ApiPropertyOptional({
    default: "assertionMethod"
  })
  @IsString()
  @IsOptional()
  proofPurpose: string = "assertionMethod";

  @ApiPropertyOptional({
    type: PartialType(DataIntegrityProof)
  })
  options: Partial<DataIntegrityProof> = {};

  @ApiPropertyOptional({
    default: false
  })
  @IsBoolean()
  @IsOptional()
  embeddedVerificationMethod: boolean = false;
}

export class ValidateRequest {
  @ApiPropertyOptional({
    type: ProofDocument
  })
  @Type(() => ProofDocument)
  @ValidateNested()
  proofDocument?: ProofDocument;
}
