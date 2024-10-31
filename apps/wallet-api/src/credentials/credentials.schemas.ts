import {
  ApiProperty,
  ApiPropertyOptional,
  ApiPropertyOptions,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  VerifiableCredential,
  CredentialSubject,
  JsonWebSignature2020,
  Proof,
  DataIntegrityProof,
  OrArray,
} from "@tsg-dsp/common-dsp";
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
import {
  ReferenceObject,
  SchemaObject,
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface.js";

const orArray = (
  schema: string | SchemaObject,
): (SchemaObject | ReferenceObject)[] => {
  if (typeof schema === "string") {
    return [
      {
        $ref: schema,
      },
      {
        type: "array",
        items: {
          $ref: schema,
        },
      },
    ];
  } else {
    return [
      schema,
      {
        type: "array",
        items: schema,
      },
    ];
  }
};

export abstract class ProofDto implements Proof {
  type!: "JsonWebSignature2020" | "DataIntegrityProof";
  proofPurpose!: string;
}

export class JsonWebSignature2020Dto implements JsonWebSignature2020 {
  @ApiProperty()
  type!: "JsonWebSignature2020";
  @ApiProperty({ format: "date-time" })
  created!: string;
  @ApiProperty()
  proofPurpose!: string;
  @ApiProperty()
  jws!: string;
  @ApiProperty()
  verificationMethod!: string;
}

export class DataIntegrityProofDto implements DataIntegrityProof {
  @ApiPropertyOptional()
  id?: string;
  @ApiProperty()
  type!: "DataIntegrityProof";
  @ApiProperty()
  proofPurpose!: string;
  @ApiPropertyOptional()
  verificationMethod?: string;
  @ApiProperty()
  cryptosuite!: string;
  @ApiPropertyOptional()
  created?: string;
  @ApiPropertyOptional()
  expires?: string;
  @ApiPropertyOptional({
    oneOf: orArray({ type: "string" }),
  })
  domain?: OrArray<string>;
  @ApiPropertyOptional()
  challenge?: string;
  @ApiProperty()
  proofValue!: string;
  @ApiPropertyOptional({
    oneOf: orArray({ type: "string" }),
  })
  previousProof?: OrArray<string>;
  @ApiPropertyOptional()
  nonce?: string;
}

export class DefaultCredentialSubjectDto implements CredentialSubject {
  @ApiProperty()
  id!: string;
  [key: string]: any;
}

export class VerifiableCredentialDto implements VerifiableCredential {
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
    oneOf: orArray(getSchemaPath(DefaultCredentialSubjectDto)),
  })
  credentialSubject!: OrArray<DefaultCredentialSubjectDto>;
  @ApiProperty()
  issuer!: string;
  @ApiPropertyOptional({ format: "date-time" })
  expirationDate?: string;
  @ApiProperty({ format: "date-time" })
  issuanceDate!: string;
  @ApiPropertyOptional()
  evidence?: any;
  @ApiProperty({
    oneOf: orArray({
      oneOf: [
        {
          $ref: getSchemaPath(DataIntegrityProofDto),
        },
        {
          $ref: getSchemaPath(JsonWebSignature2020Dto),
        },
      ],
    }),
  })
  proof!: OrArray<ProofDto>;
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
