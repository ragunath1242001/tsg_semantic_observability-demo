import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { DataIntegrityProof, OrArray } from "@tsg-dsp/common-dsp";
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

export class ProofDocument {
  @ApiProperty({
    type: () => [DataIntegrityProof],
    example: [
      {
        type: "DataIntegrityProof",
        created: "2023-10-12T18:25:43.511Z",
        proofPurpose: "assertionMethod",
        verificationMethod: "did:example:12345#key-1",
        cryptosuite: "ecdsa-2019",
        proofValue: "zQm..."
      }
    ]
  })
  @Type(() => DataIntegrityProof)
  @IsDefined()
  @ValidateNested()
  proof!: OrArray<DataIntegrityProof>;
  [key: string]: any;
}

export class SignRequest {
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
        type: "DataIntegrityProof",
        created: "2023-10-12T18:25:43.511Z",
        proofPurpose: "assertionMethod",
        verificationMethod: "did:example:12345#key-1",
        cryptosuite: "ecdsa-jcs-2019",
        proofValue: "zQm..."
      }
    }
  })
  @Type(() => ProofDocument)
  @ValidateNested()
  proofDocument?: ProofDocument;
}
