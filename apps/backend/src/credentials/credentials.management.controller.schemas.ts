import {
  ApiProperty,
  ApiPropertyOptional,
  ApiPropertyOptions,
} from "@nestjs/swagger";
import { VerifiableCredential, CredentialSubject } from "@tsg-dsp/common";
import { IsString, IsBoolean, IsDate } from "class-validator";
import { InitCredentialConfig } from "../config.js";
import { Credentials } from "../model/credentials.dao.js";

const credentialSubjectSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      title: "DID Identifier of the credential subject",
      example: "did:web:localhost",
    },
  },
  additionalProperties: true,
};

const credentialSchema: ApiPropertyOptions = {
  type: "object",
  properties: {
    "@context": {
      type: "array",
      items: {
        type: "string",
      },
    },
    id: {
      type: "string",
    },
    type: {
      type: "array",
      items: {
        type: "string",
      },
    },
    issuer: {
      type: "string",
    },
    credentialSubject: {
      oneOf: [
        credentialSubjectSchema,
        {
          type: "array",
          items: credentialSubjectSchema,
        },
      ],
    },
    expirationDate: {
      type: "string",
      format: "date-time",
    },
    issuanceDate: {
      type: "string",
      format: "date-time",
    },
    evidence: {
      type: "object",
    },
    proof: {
      type: "object",
      properties: {
        type: { type: "string" },
        created: { type: "string", format: "date-time" },
        proofPurpose: { type: "string" },
        jws: { type: "string" },
        verificationMethod: { type: "string" },
      },
      required: [
        "type",
        "created",
        "proofPurpose",
        "jws",
        "verificationMethod",
      ],
    },
  },
};

export class CredentialsDto implements Credentials {
  @IsString()
  @ApiProperty()
  id!: string;
  @IsString()
  @ApiProperty()
  targetDid!: string;
  @IsString()
  @ApiProperty(credentialSchema)
  credential!: VerifiableCredential<CredentialSubject>;
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
  @ApiProperty(credentialSubjectSchema)
  credentialSubject!: CredentialSubject;
}
