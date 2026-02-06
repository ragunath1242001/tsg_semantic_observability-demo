import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Credential,
  CredentialSubject,
  DataIntegrityProof,
  OrArray
} from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsString,
  ValidateNested
} from "class-validator";

import { InitCredentialConfig, TrustAnchorConfig } from "../config.js";
import { IssueConfigurationConfigDto } from "../issue-configurations/issue-configuration.schemas.js";
import { CredentialDao } from "../model/credentials.dao.js";

export class TrustAnchorConfigDto implements TrustAnchorConfig {
  @IsString()
  @ApiProperty({
    example: "b86483f3-3792-4a54-b11e-f1c6face9935",
    description: "A unique identifier for the trust anchor"
  })
  id!: string;

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
        id: "b86483f3-3792-4a54-b11e-f1c6face9935",
        credentialTypes: ["DataSpaceCredentialType"]
      }
    ],
    description: "List of trust anchors configurations"
  })
  @ValidateNested({ each: true })
  @Type(() => TrustAnchorConfigDto)
  trustAnchors!: TrustAnchorConfigDto[];

  @ApiProperty({
    type: [IssueConfigurationConfigDto],
    example: [
      {
        id: "issue-config-123",
        credentialType: "DataSpaceCredentialType",
        documentUrl: "https://dataspace.example/issue-config",
        schema: {}
      }
    ],
    description: "List of issue configurations supported by the wallet"
  })
  @ValidateNested({ each: true })
  @Type(() => IssueConfigurationConfigDto)
  issueConfigurations!: IssueConfigurationConfigDto[];
}

export class CredentialsDto implements Omit<
  CredentialDao,
  "resourceType" | "syncOwnerIdentifier" | "generateId"
> {
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

  @ValidateNested()
  @Type(() => Credential)
  @ApiProperty({
    type: () => Credential,
    example: {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential", "DataSpaceCredential"],
      issuer: "did:example:issuer",
      validFrom: "2023-10-01T00:00:00Z",
      credentialSubject: { id: "did:example:subject" }
    },
    description: "The verifiable credential object"
  })
  credential!: Credential;

  @ApiProperty({
    type: () => [DataIntegrityProof],
    example: [
      {
        type: "DataIntegrityProof",
        created: "2020-01-01T00:00:00Z",
        proofPurpose: "assertionMethod",
        cryptosuite: "eddsa-rdfc-2022",
        proofValue: "...",
        verificationMethod: "did:example:123456#key-1"
      }
    ]
  })
  @ValidateNested()
  @Type(() => DataIntegrityProof)
  proof?: OrArray<DataIntegrityProof>;

  @IsString()
  @ApiPropertyOptional({
    example: "jwt-token-123",
    description: "JWT representation of the credential"
  })
  jwt?: string;

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
  createdDate!: Date;

  @IsDate()
  @ApiProperty({
    example: "2023-10-02T00:00:00Z",
    description: "Modification timestamp"
  })
  modifiedDate!: Date;

  @IsDate()
  @ApiPropertyOptional({
    example: "2023-10-03T00:00:00Z",
    description: "Optional deletion timestamp"
  })
  deletedDate!: Date;
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

  @IsString()
  @ApiProperty({
    title: "Type of proof used for the credential",
    enum: ["ldp", "jwt"],
    description: "Type of proof used for the credential",
    example: "ldp"
  })
  proofType!: "ldp" | "jwt";

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
