import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsString,
  ValidateNested
} from "class-validator";
import { CredentialDao } from "../model/credentials.dao.js";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common-dsp";
import { InitCredentialConfig, TrustAnchorConfig } from "../config.js";
import { Type } from "class-transformer";
import { JsonLdContextConfigDto } from "../contexts/context.schemas.js";

export class TrustAnchorConfigDto implements TrustAnchorConfig {
  @IsString()
  @ApiProperty({
    example: "b86483f3-3792-4a54-b11e-f1c6face9935",
    description: "A unique identifier for the trust anchor"
  })
  identifier!: string;

  @IsString()
  @ApiProperty({
    type: [String],
    example: ["DataSpaceCredentialType"],
    description: "Credential types associated with the trust anchor"
  })
  credentialTypes!: string[];
}

export class CredentialsConfigDto {
  @ApiProperty({
    type: [TrustAnchorConfigDto],
    example: [
      {
        identifier: "b86483f3-3792-4a54-b11e-f1c6face9935",
        credentialTypes: ["DataSpaceCredentialType"]
      }
    ],
    description: "List of trust anchors configurations"
  })
  @ValidateNested({ each: true })
  @Type(() => TrustAnchorConfigDto)
  trustAnchors!: TrustAnchorConfigDto[];

  @ApiProperty({
    type: [JsonLdContextConfigDto],
    example: [
      {
        url: "https://dataspace.example/context",
        alias: "ds"
      }
    ],
    description: "List of JSON-LD contexts configurations"
  })
  @ValidateNested({ each: true })
  @Type(() => JsonLdContextConfigDto)
  contexts!: JsonLdContextConfigDto[];
}

export class CredentialsDto implements CredentialDao {
  @IsString()
  @ApiProperty({
    example: "b86483f3-3792-4a54-b11e-f1c6face9935",
    description: "Unique identifier of the credential record"
  })
  id!: string;

  @IsString()
  @ApiProperty({
    example: "did:example:456",
    description: "Target decentralized identifier"
  })
  targetDid!: string;

  @IsString()
  @ApiProperty({
    type: () => VerifiableCredential,
    example: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "DataSpaceCredential"],
      issuer: "did:example:issuer",
      issuanceDate: "2023-10-01T00:00:00Z",
      credentialSubject: { id: "did:example:subject" }
    },
    description: "The verifiable credential object"
  })
  credential!: VerifiableCredential;

  @IsBoolean()
  @ApiProperty({
    example: true,
    description: "If the credential is self issued"
  })
  selfIssued!: boolean;

  @IsBoolean()
  @ApiProperty({
    example: false,
    description: "Indicates if the credential has been revoked"
  })
  revoked!: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: "Optional status list index"
  })
  @IsNumber()
  statusListIndex?: number;

  @IsDate()
  @ApiProperty({
    example: "2023-10-01T00:00:00Z",
    description: "Creation timestamp"
  })
  created!: Date;

  @IsDate()
  @ApiProperty({
    example: "2023-10-02T00:00:00Z",
    description: "Modification timestamp"
  })
  modified!: Date;

  @IsDate()
  @ApiPropertyOptional({
    example: "2023-10-03T00:00:00Z",
    description: "Optional deletion timestamp"
  })
  deleted!: Date;
}

export class CredentialConfigDto implements InitCredentialConfig {
  @ApiPropertyOptional({
    type: [String],
    title: "JSON-LD Contexts for the credential",
    example: ["https://dataspace.example/context"],
    description: "A list of JSON-LD contexts applied to the credential"
  })
  context!: string[];

  @ApiPropertyOptional({
    type: [String],
    title: "Credential Type",
    example: ["DataSpaceMembershipCredential"],
    description: "Types that classify the credential"
  })
  type!: string[];

  @ApiProperty({
    title: "Credential ID",
    example: "credential-id-789",
    description: "Unique identifier for the credential configuration"
  })
  id!: string;

  @ApiPropertyOptional({
    example: "key-identifier-001",
    description: "Optional key identifier associated with the credential"
  })
  keyId?: string;

  @ApiProperty({
    type: () => CredentialSubject,
    example: {
      id: "did:example:subject",
      name: "Subject Name"
    },
    description: "The credential subject details"
  })
  credentialSubject!: CredentialSubject;

  @ApiProperty({
    example: true,
    description: "Indicates whether the credential is revocable"
  })
  revocable!: boolean;
}
