import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common";
import { Type } from "class-transformer";
import { IsDefined, IsString, ValidateNested } from "class-validator";


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