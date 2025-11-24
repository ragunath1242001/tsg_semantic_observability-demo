import { ApiProperty } from "@nestjs/swagger";
import { DCPCredentialRequestInitiation } from "@tsg-dsp/wallet-dtos";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

export class ProjectAgreementCallbackDto {
  @ApiProperty({ description: "URL to send the callback to" })
  @IsString()
  @IsDefined()
  public url!: string;

  @ApiProperty({ description: "Authorization token for the callback" })
  @IsString()
  @IsDefined()
  public authToken!: string;
}

export class SignatureResponseMessage {
  @ApiProperty({ description: "Decentralized identifier of the participant" })
  @IsString()
  @IsDefined()
  public participantId!: string;

  @ApiProperty({ description: "Unique identifier of the project agreement" })
  @IsString()
  @IsDefined()
  public projectId!: string;

  @ApiProperty({ description: "Signature provided by the participant" })
  @IsString()
  @IsDefined()
  public signature!: string;
}

export class ProjectAgreementFinalizationMessage {
  @ApiProperty({ description: "Unique identifier of the project agreement" })
  @IsString()
  @IsDefined()
  public projectId!: string;

  @ApiProperty({ description: "Hash of the finalized project agreement" })
  @IsString()
  @IsDefined()
  public hash!: string;

  @ApiProperty({ description: "Signatures from all participants" })
  @IsDefined()
  public signatures!: Record<string, string>;

  @ApiProperty({
    description: "Credential offer for the project agreement credential"
  })
  @ValidateNested()
  @Type(() => DCPCredentialRequestInitiation)
  @IsDefined()
  public offer!: DCPCredentialRequestInitiation;
}

export class ProjectAgreementParticipant {
  @ApiProperty({ description: "Title of the participant" })
  @IsString()
  @IsDefined()
  public title!: string;

  @ApiProperty({
    description: "Decentralized identifier of the participant",
    example: "did:example:participant-1"
  })
  @IsString()
  @IsDefined()
  public didId!: string;
}

export class ProjectAgreementDto {
  @ApiProperty({ description: "Unique identifier of the project agreement" })
  @IsString()
  @IsDefined()
  public id!: string;

  @ApiProperty({ description: "Title of the project" })
  @IsString()
  @IsDefined()
  public title!: string;

  @ApiProperty({ description: "Description of the project" })
  @IsString()
  @IsDefined()
  public description!: string;

  @ApiProperty({
    description: "List of participants in the project",
    type: [ProjectAgreementParticipant]
  })
  @ValidateNested({ each: true })
  @Type(() => ProjectAgreementParticipant)
  @ArrayNotEmpty()
  public participants!: ProjectAgreementParticipant[];

  @ApiProperty({
    description: "Start date of the agreement validity",
    example: "2024-01-01T00:00:00Z"
  })
  @IsDateString()
  @IsDefined()
  public validFrom!: string;

  @ApiProperty({
    description: "End date of the agreement validity",
    example: "2025-01-01T00:00:00Z"
  })
  @IsDateString()
  @IsDefined()
  public validUntil!: string;

  @ApiProperty({ description: "Purpose of the data sharing" })
  @IsString()
  @IsDefined()
  public purpose!: string;

  @ApiProperty({ description: "Research question being addressed" })
  @IsString()
  @IsDefined()
  public researchQuestion!: string;

  @ApiProperty({
    description: "List of objectives for the project",
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  public objectives!: string[];

  @ApiProperty({
    description: "List of hypotheses for the project",
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  public hypotheses!: string[];

  @ApiProperty({
    description: "List of data use conditions",
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  public dataUseConditions!: string[];

  @ApiProperty({
    description: "List of security measures",
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  public securityMeasures!: string[];

  @ApiProperty({
    description: "List of compliance requirements",
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  public complianceRequirements!: string[];
}

export class DatasetSummaryDto {
  @ApiProperty({ description: "Unique identifier of the dataset" })
  @IsString()
  @IsDefined()
  public id!: string;

  @ApiProperty({ description: "Title of the dataset" })
  @IsString()
  @IsDefined()
  public title!: string;
}

export class ProjectAgreementDetailDto {
  @ApiProperty({ description: "Internal identifier of the project agreement" })
  @IsString()
  @IsDefined()
  public id!: number;

  @ApiProperty({ description: "Decentralized identifier of the initiator" })
  @IsString()
  @IsDefined()
  public initiator!: string;

  @ApiProperty({ description: "Project agreement details" })
  @ValidateNested()
  @Type(() => ProjectAgreementDto)
  @IsDefined()
  public projectAgreement!: ProjectAgreementDto;

  @ApiProperty({
    description: "Signatures from all participants",
    type: Object
  })
  @IsDefined()
  public signatures!: Record<string, string>;

  @ApiProperty({
    description: "Hash of the project agreement",
    example: "abc123def456ghi789jkl012mno345pq"
  })
  @IsString()
  @IsOptional()
  public hash?: string;

  @ApiProperty({ description: "Current status of the project agreement" })
  @IsIn([
    "WAITING_FOR_SIGNATURES",
    "SIGNATURE_REQUESTED",
    "SIGNED",
    "FINALIZED"
  ])
  @IsDefined()
  public status!:
    | "WAITING_FOR_SIGNATURES"
    | "SIGNATURE_REQUESTED"
    | "SIGNED"
    | "FINALIZED";

  @ApiProperty({ description: "Datasets linked to the project agreement" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DatasetSummaryDto)
  public datasets!: DatasetSummaryDto[];
}

export class SignatureRequestMessage {
  @ApiProperty({ description: "Project agreement to be signed" })
  @ValidateNested()
  @Type(() => ProjectAgreementDto)
  @IsDefined()
  public projectAgreement!: ProjectAgreementDto;

  @ApiProperty({ description: "Callback information for the signature" })
  @ValidateNested()
  @Type(() => ProjectAgreementCallbackDto)
  @IsDefined()
  public callback!: ProjectAgreementCallbackDto;
}
