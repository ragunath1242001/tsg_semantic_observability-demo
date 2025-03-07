import "reflect-metadata";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import {
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

export class LegalRegistrationNumberRequest {
  @IsString()
  @ApiProperty({
    example: "vc-123",
    description: "Unique identifier for the VC"
  })
  vcId!: string;

  @IsString()
  @ApiProperty({
    example: "clearing-house-01",
    description: "Clearing house identifier"
  })
  clearingHouse!: string;

  @ValidateNested()
  @Type(() => CredentialSubject)
  @IsDefined()
  @ApiProperty({
    type: () => CredentialSubject,
    example: { name: "John Doe", id: "subject-1" },
    description: "The credential subject details"
  })
  credentialSubject!: CredentialSubject;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: "Optional additional info",
    description: "Additional optional information"
  })
  additionalInfo?: string;
}

export class ComplianceRequest {
  @IsString()
  @ApiProperty({
    example: "vc-456",
    description: "Unique identifier for the VC"
  })
  vcId!: string;

  @IsString()
  @ApiProperty({
    example: "clearing-house-02",
    description: "Clearing house identifier"
  })
  clearingHouse!: string;

  @ValidateNested({ each: true })
  @Type(() => VerifiableCredential)
  @IsDefined()
  @ApiProperty({
    type: () => [VerifiableCredential],
    example: [
      { credential: "example-credential-1", issuer: "issuer-1" },
      { credential: "example-credential-2", issuer: "issuer-2" }
    ],
    description: "An array of verifiable credentials"
  })
  credentials!: VerifiableCredential[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: "Optional compliance note",
    description: "Additional optional note"
  })
  note?: string;
}
