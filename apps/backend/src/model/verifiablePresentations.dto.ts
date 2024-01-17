import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";


export class Signature {
  @IsString()
  type!: string;
  @IsString()
  created!: string;
  @IsString()
  proofPurpose!: string;
  @IsString()
  jws!: string;
  @IsString()
  verificationMethod!: string;
}

export class CredentialSubject {
  @IsString()
  id!: string
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any
}

export class Credential<T extends CredentialSubject> {
  @IsString({each: true})
  '@context': string[]
  @IsString({each: true})
  type!: string[]
  @IsString()
  @IsOptional()
  id?: string
  @ValidateNested()
  @Type(() => CredentialSubject)
  credentialSubject!: T
  @IsString()
  issuer!: string
  @IsString()
  expirationDate?: string
  @IsString()
  issuanceDate!: string
}

export class VerifiableCredential<T extends CredentialSubject = CredentialSubject> extends Credential<T> {
  @ValidateNested()
  @Type(() => Signature)
  proof!: Signature;
}

export class VerifiablePresentation<T extends VerifiableCredential<CredentialSubject> = VerifiableCredential> {
  @IsString({each: true})
  '@context': string[]
  @IsString({each: true})
  '@type': string[]
  @IsString()
  @IsOptional()
  '@id'?: string
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