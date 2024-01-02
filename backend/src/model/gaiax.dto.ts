import { IsDefined, IsString, ValidateNested } from "class-validator";
import { CredentialSubject, VerifiableCredential } from "./credentials.dto.js";
import { Type } from "class-transformer";


export class LegalRegistrationNumberRequest {
  @IsString()
  vcId!: string

  @IsString()
  clearingHouse!: string

  @ValidateNested()
  @Type(() => CredentialSubject)
  @IsDefined()
  credentialSubject!: CredentialSubject
}

export class ComplianceRequest {
  @IsString()
  vcId!: string

  @IsString()
  clearingHouse!: string

  @ValidateNested({each: true})
  @Type(() => VerifiableCredential<CredentialSubject>)
  @IsDefined()
  credentials!: VerifiableCredential<CredentialSubject>[]
}