import {
  ApiProperty,
  ApiPropertyOptional,
  ApiPropertyOptions,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  VerifiableCredential,
  CredentialSubject,
  Signature,
} from "@libs/common-dsp";
import {
  IsString,
  IsBoolean,
  IsDate,
  ValidateNested,
  IsOptional,
} from "class-validator";
import {
  InitCredentialConfig,
  JsonLdContextConfig,
  TrustAnchorConfig,
} from "../config.js";
import { Credentials } from "../model/credentials.dao.js";
import { Type } from "class-transformer";
import { JsonLdContextConfigDto } from "../contexts/context.schemas.js";

export class SignatureDto implements Signature {
  @ApiProperty()
  type!: string;
  @ApiProperty({ format: "date-time" })
  created!: string;
  @ApiProperty()
  proofPurpose!: string;
  @ApiProperty()
  jws!: string;
  @ApiProperty()
  verificationMethod!: string;
}

export class DefaultCredentialSubjectDto implements CredentialSubject {
  @ApiProperty()
  id!: string;
  [key: string]: any;
}

export class VerifiableCredentialDto
  implements VerifiableCredential<CredentialSubject>
{
  @ApiProperty({
    type: [String],
  })
  "@context": string[];
  @ApiProperty({
    type: [String],
  })
  type!: string[];
  @ApiPropertyOptional()
  id?: string;
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(DefaultCredentialSubjectDto) },
      {
        type: "array",
        items: {
          $ref: getSchemaPath(DefaultCredentialSubjectDto),
        },
      },
    ],
  })
  credentialSubject!:
    | DefaultCredentialSubjectDto
    | DefaultCredentialSubjectDto[];
  @ApiProperty()
  issuer!: string;
  @ApiPropertyOptional({ format: "date-time" })
  expirationDate?: string;
  @ApiProperty({ format: "date-time" })
  issuanceDate!: string;
  @ApiPropertyOptional()
  evidence?: any;
  @ApiProperty()
  proof!: SignatureDto;
}

export class TrustAnchorConfigDto implements TrustAnchorConfig {
  @IsString()
  @ApiProperty()
  identifier!: string;

  @IsString()
  @ApiProperty({
    type: [String],
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

export class CredentialsDto implements Credentials {
  @IsString()
  @ApiProperty()
  id!: string;
  @IsString()
  @ApiProperty()
  targetDid!: string;
  @IsString()
  @ApiProperty()
  credential!: VerifiableCredentialDto;
  @IsBoolean()
  @ApiProperty()
  selfIssued!: boolean;
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
    example: ["https://dataspace.example/context"],
  })
  context!: string[];
  @ApiPropertyOptional({
    type: [String],
    title: "Credential Type",
    example: ["DataSpaceMembershipCredential"],
  })
  type!: string[];
  @ApiProperty({
    title: "Credential ID",
  })
  id!: string;
  @ApiPropertyOptional()
  keyId?: string;
  @ApiProperty()
  credentialSubject!: DefaultCredentialSubjectDto;
}
