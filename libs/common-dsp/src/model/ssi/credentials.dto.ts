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
  id!: string;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
}

export class Credential<T extends CredentialSubject> {
  @IsString({ each: true })
  "@context": string[];
  @IsString({ each: true })
  type!: string[];
  @IsString()
  @IsOptional()
  id?: string;
  @ValidateNested()
  @Type(() => CredentialSubject)
  credentialSubject!: T | T[];
  @IsString()
  issuer!: string;
  @IsString()
  @IsOptional()
  expirationDate?: string;
  @IsString()
  issuanceDate!: string;
  @IsOptional()
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  evidence?: any;
}

export class VerifiableCredential<
  T extends CredentialSubject
> extends Credential<T> {
  @ValidateNested()
  @Type(() => Signature)
  proof!: Signature;
}
