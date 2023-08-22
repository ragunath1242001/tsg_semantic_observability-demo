import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";

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
  @IsString({each: true})
  @IsOptional()
  type?: string[]
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

export class VerifiableCredential<T extends CredentialSubject> extends Credential<T> {
  @ValidateNested()
  @Type(() => Signature)
  proof!: Signature;
}

export class VerifiablePresentation<T extends VerifiableCredential<CredentialSubject>> {
  @IsString({each: true})
  '@context': string[]
  @IsString({each: true})
  '@type': string[]
  @IsString()
  @IsOptional()
  '@id'?: string
  @ValidateNested()
  @Type(() => VerifiableCredential<CredentialSubject>)
  verifiableCredential!: T[];
}