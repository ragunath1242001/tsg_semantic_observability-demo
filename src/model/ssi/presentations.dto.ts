import { Type } from "class-transformer";
import { IsString, IsOptional, ValidateNested, IsBoolean, IsIn } from "class-validator";
import { VerifiableCredential, CredentialSubject } from "./credentials.dto";


export class VerifiablePresentation<T extends VerifiableCredential<CredentialSubject>> {
  @IsString({each: true})
  '@context': string[]
  @IsString({each: true})
  type!: string[]
  @IsString()
  @IsOptional()
  id?: string
  @ValidateNested()
  @Type(() => VerifiableCredential<CredentialSubject>)
  verifiableCredential!: T[] | T;
}

export class VerifiablePresentationJwt {
  @IsString()
  vp!: string;
}

export class VerifiablePresentationJsonLd {
  @ValidateNested()
  @Type(() => VerifiablePresentation)
  vp!: VerifiablePresentation<VerifiableCredential<CredentialSubject>>;
}

export class PresentationValidation extends VerifiablePresentationJwt {
  @IsBoolean()
  valid!: boolean

  @IsBoolean()
  validateJWTSignature!: boolean;

  @IsBoolean()
  validateJWTExpiryDate!: boolean;

  @IsBoolean({each: true})
  validateTrustAnchors!: Array<boolean>

  @IsIn([true, false, "undefined"])
  validateExpiryDate!: Array<boolean | "undefined">;
  
  @IsBoolean({each: true})
  validateCredentials!: Array<boolean>;

  @IsBoolean()
  @IsOptional()
  validateAudience?: boolean;
}