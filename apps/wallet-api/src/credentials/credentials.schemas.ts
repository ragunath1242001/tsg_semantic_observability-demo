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
  @ApiProperty()
  identifier!: string;

  @IsString()
  @ApiProperty({
    type: [String]
  })
  credentialTypes!: string[];
}

export class CredentialsConfigDto {
  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => TrustAnchorConfigDto)
  trustAnchors!: TrustAnchorConfigDto[];

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => JsonLdContextConfigDto)
  contexts!: JsonLdContextConfigDto[];
}

export class CredentialsDto implements CredentialDao {
  @IsString()
  @ApiProperty()
  id!: string;
  @IsString()
  @ApiProperty()
  targetDid!: string;
  @IsString()
  @ApiProperty({ type: () => VerifiableCredential })
  credential!: VerifiableCredential;
  @IsBoolean()
  @ApiProperty()
  selfIssued!: boolean;
  @IsBoolean()
  @ApiProperty()
  revoked!: boolean;
  @ApiPropertyOptional()
  @IsNumber()
  statusListIndex?: number;
  @IsDate()
  @ApiProperty()
  created!: Date;
  @IsDate()
  @ApiProperty()
  modified!: Date;
  @IsDate()
  @ApiPropertyOptional()
  deleted!: Date;
}

export class CredentialConfigDto implements InitCredentialConfig {
  @ApiPropertyOptional({
    type: [String],
    title: "JSON-LD Contexts for the credential",
    example: ["https://dataspace.example/context"]
  })
  context!: string[];
  @ApiPropertyOptional({
    type: [String],
    title: "Credential Type",
    example: ["DataSpaceMembershipCredential"]
  })
  type!: string[];
  @ApiProperty({
    title: "Credential ID"
  })
  id!: string;
  @ApiPropertyOptional()
  keyId?: string;
  @ApiProperty({ type: () => CredentialSubject })
  credentialSubject!: CredentialSubject;
  @ApiProperty()
  revocable!: boolean;
}
