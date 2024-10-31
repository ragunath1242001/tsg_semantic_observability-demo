import {
  DataIntegrityProof,
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

export class ProofDocument {
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
  @IsString()
  @IsOptional()
  @IsIn(["DataIntegrityProof", "JsonWebSignature2020"])
  type?: "JsonWebSignature2020" | "DataIntegrityProof";

  @IsObject()
  @IsDefined()
  plainDocument: Record<string, any>;

  @IsString()
  @IsOptional()
  keyId?: string;

  @IsString()
  @IsOptional()
  @IsIn(["RDFC", "JCS"])
  normalization: "RDFC" | "JCS" = "RDFC";

  @IsString()
  @IsOptional()
  proofPurpose: string = "assertionMethod";
  options: Partial<DataIntegrityProof> = {};

  @IsBoolean()
  @IsOptional()
  embeddedVerificationMethod: boolean = false;
}

export class ValidateRequest {
  @Type(() => ProofDocument)
  @ValidateNested()
  proofDocument?: ProofDocument;
}
