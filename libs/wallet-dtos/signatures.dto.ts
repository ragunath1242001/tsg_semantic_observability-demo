import { Signature } from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import {
  IsDefined,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class JsonWebSignature {
  @Type(() => Signature)
  @ValidateNested()
  @IsDefined()
  proof: Signature;
  [key: string]: any;
}

export class SignRequest {
  @IsString()
  @IsDefined()
  @IsIn(["JsonWebSignature"])
  type: "JsonWebSignature";

  @IsObject()
  @IsDefined()
  plainDocument: Record<string, any>;

  @IsString()
  @IsOptional()
  keyId?: string;
}

export class ValidateRequest {
  @IsString()
  @IsDefined()
  @IsIn(["JsonWebSignature"])
  type: "JsonWebSignature";

  @Type(() => JsonWebSignature)
  @ValidateNested()
  @ValidateIf((v) => v.type === "JsonWebSignature")
  jsonWebSignature?: JsonWebSignature;
}
