import "reflect-metadata";
import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import { IsString, ValidateNested, IsDefined } from "class-validator";

export class LegalRegistrationNumberRequest {
  @IsString()
  vcId!: string;

  @IsString()
  clearingHouse!: string;

  @ValidateNested()
  @Type(() => CredentialSubject)
  @IsDefined()
  credentialSubject!: CredentialSubject;
}

export class ComplianceRequest {
  @IsString()
  vcId!: string;

  @IsString()
  clearingHouse!: string;

  @ValidateNested({ each: true })
  @Type(() => VerifiableCredential)
  @IsDefined()
  credentials!: VerifiableCredential[];
}
