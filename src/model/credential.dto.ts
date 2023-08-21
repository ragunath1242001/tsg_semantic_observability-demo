import { Type } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

export class Signature {
  type!: string;
  created!: string;
  proofPurpose!: string;
  jws!: string;
  verificationMethod!: string;
}

export class CredentialSubject {
  @IsString()
  id!: string
  @IsString({each: true})
  @IsOptional()
  type?: string[]
  [key: string]: any
}

export class Credential<T extends CredentialSubject> {
  '@context': string[] | string
  type!: string | string[]
  id?: string
  credentialSubject!: T
  issuer!: string
  expirationDate?: string
  issuanceDate!: string
}

export class VerifiableCredential<T extends CredentialSubject> extends Credential<T> {
  proof!: Signature;
}

export class VerifiablePresentation<T extends VerifiableCredential<CredentialSubject>> {
  '@context': string[] | string
  '@type': string[] | string
  '@id'?: string
  verifiableCredential!: T[];
}