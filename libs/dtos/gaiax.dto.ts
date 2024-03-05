import 'reflect-metadata'
import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common/dist/model/ssi/credentials.dto.js"
import { Type } from "class-transformer"
import { IsString, ValidateNested, IsDefined } from "class-validator"


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