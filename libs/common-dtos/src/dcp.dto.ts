import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  ApiSchema,
  getSchemaPath
} from "@nestjs/swagger";
import { VerifiablePresentation } from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import {
  ArrayContains,
  ArrayMinSize,
  Equals,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import {
  PresentationDefinition,
  PresentationSubmission
} from "./presentationdefinition.dto.js";

export class VerificationRequest {
  @ApiProperty({ type: () => PresentationDefinition })
  @ValidateNested()
  @Type(() => PresentationDefinition)
  presentationDefinition!: PresentationDefinition;
  @ApiProperty()
  @IsString()
  holderIdToken!: string;
}

export class PresentationQueryMessage {
  @ApiProperty()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayContains(["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"])
  "@context": string[];

  @ApiProperty({ example: "PresentationQueryMessage" })
  @IsString()
  @Equals("PresentationQueryMessage")
  type!: "PresentationQueryMessage";

  @ApiPropertyOptional({ type: () => PresentationDefinition })
  @IsOptional()
  @ValidateNested()
  @Type(() => PresentationDefinition)
  presentationDefinition?: PresentationDefinition;

  @ApiPropertyOptional({
    type: [String],
    example: ["https://example.com/credential-1"]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scope?: string[];
}

@ApiExtraModels(VerifiablePresentation)
export class PresentationResponseMessage {
  @ApiProperty({ example: ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"] })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayContains(["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"])
  "@context": string[];

  @ApiProperty({ example: "PresentationResponseMessage" })
  @IsString()
  @Equals("PresentationResponseMessage")
  type!: "PresentationResponseMessage";

  @ApiProperty({
    type: "array",
    items: {
      oneOf: [
        { type: "string" },
        { $ref: getSchemaPath(VerifiablePresentation) }
      ]
    }
  })
  @IsArray()
  presentation!: (string | object)[];

  @ApiPropertyOptional({
    type: () => PresentationSubmission,
    example: {
      id: "submission-id",
      definition_id: "definition-id",
      descriptor_map: []
    }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PresentationSubmission)
  presentationSubmission?: PresentationSubmission;
}

export class CredentialRequestCredential {
  @ApiProperty()
  @IsString()
  id!: string;
}

export class CredentialRequestMessage {
  @ApiProperty({ example: ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"] })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayContains(["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"])
  "@context": string[];

  @ApiProperty({ example: "CredentialRequestMessage" })
  @IsString()
  @Equals("CredentialRequestMessage")
  type!: "CredentialRequestMessage";

  @ApiProperty()
  @IsString()
  holderPid!: string;

  @ApiProperty({ type: [CredentialRequestCredential] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CredentialRequestCredential)
  @ArrayMinSize(1)
  credentials!: CredentialRequestCredential[];
}

export class CredentialContainer {
  @ApiProperty()
  @IsString()
  payload!: string;

  @ApiProperty()
  @IsString()
  credentialType!: string;

  @ApiProperty()
  @IsString()
  format!: string;
}

export class CredentialMessage {
  @ApiProperty({ example: ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"] })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayContains(["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"])
  "@context": string[];

  @ApiProperty({ example: "CredentialMessage" })
  @IsString()
  @Equals("CredentialMessage")
  type!: "CredentialMessage";

  @ApiProperty()
  @IsString()
  issuerPid!: string;

  @ApiProperty()
  @IsString()
  holderPid!: string;

  @ApiProperty({ enum: ["ISSUED", "REJECTED"] })
  @IsString()
  status!: "ISSUED" | "REJECTED";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ type: [CredentialContainer] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CredentialContainer)
  credentials?: CredentialContainer[];
}

export class CredentialObject {
  @ApiProperty({
    example: "db8a34c7-aa42-4aae-bb57-69cd805ef01a",
    description: "Unique identifier for the credential object"
  })
  @IsString()
  id!: string;

  @ApiProperty({
    example: "CredentialObject",
    description: "Type identifier"
  })
  @IsString()
  @Equals("CredentialObject")
  type!: "CredentialObject";

  @ApiProperty({
    type: [String],
    description: "Types of credential being offered"
  })
  @IsArray()
  @IsString()
  credentialType!: string;

  @ApiProperty({
    description: "Reason for offering this credential"
  })
  @IsString()
  offerReason!: string;

  @ApiProperty({
    type: [String],
    description: "Supported binding methods"
  })
  @IsArray()
  @IsString({ each: true })
  bindingMethods!: string[];

  @ApiProperty({
    type: String,
    description: "Supported cryptographic methods"
  })
  @IsString()
  profile!: string;

  @ApiPropertyOptional({
    type: () => PresentationDefinition,
    description: "Issuance policy definition"
  })
  @ValidateNested()
  @Type(() => PresentationDefinition)
  @IsOptional()
  issuancePolicy?: PresentationDefinition;
}

export class CredentialOfferMessage {
  @ApiProperty({ example: ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"] })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayContains(["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"])
  "@context": string[];

  @ApiProperty({ example: "CredentialOfferMessage" })
  @IsString()
  @Equals("CredentialOfferMessage")
  type!: "CredentialOfferMessage";

  @ApiProperty()
  @IsString()
  issuer!: string;

  @ApiProperty({ type: [CredentialObject] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CredentialObject)
  credentials!: CredentialObject[];
}

export class IssuerMetadata {
  @ApiProperty({ example: ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"] })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayContains(["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"])
  "@context": string[];

  @ApiProperty({ example: "IssuerMetadata" })
  @IsString()
  @Equals("IssuerMetadata")
  type!: "IssuerMetadata";

  @ApiProperty()
  @IsString()
  issuer!: string;

  @ApiProperty({ type: [CredentialObject] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CredentialObject)
  credentialsSupported!: CredentialObject[];
}

@ApiSchema({ name: "DCPCredentialStatus" })
export class CredentialStatus {
  @ApiProperty({ example: ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"] })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayContains(["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"])
  "@context": string[];

  @ApiProperty({ example: "CredentialStatus" })
  @IsString()
  @Equals("CredentialStatus")
  type!: "CredentialStatus";

  @ApiProperty()
  @IsString()
  issuerPid!: string;

  @ApiProperty()
  @IsString()
  holderPid!: string;

  @ApiProperty({ enum: ["RECEIVED", "REJECTED", "ISSUED"] })
  @IsString()
  status!: "RECEIVED" | "REJECTED" | "ISSUED";
}
