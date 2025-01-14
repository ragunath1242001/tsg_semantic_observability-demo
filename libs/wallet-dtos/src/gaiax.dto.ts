import "reflect-metadata";
import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import { IsString, ValidateNested, IsDefined } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LegalRegistrationNumberRequest {
  @IsString()
  @ApiProperty()
  vcId!: string;

  @IsString()
  @ApiProperty()
  clearingHouse!: string;

  @ValidateNested()
  @Type(() => CredentialSubject)
  @IsDefined()
  @ApiProperty({ type: () => CredentialSubject })
  credentialSubject!: CredentialSubject;
}

export class ComplianceRequest {
  @IsString()
  @ApiProperty()
  vcId!: string;

  @IsString()
  @ApiProperty()
  clearingHouse!: string;

  @ValidateNested({ each: true })
  @Type(() => VerifiableCredential)
  @IsDefined()
  @ApiProperty({ type: () => [VerifiableCredential] })
  credentials!: VerifiableCredential[];
}
