import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsHexadecimal,
  IsIn,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested
} from "class-validator";

import { elementOrArray, OrArray } from "../../utils/unions.js";

export abstract class Proof {
  @ApiProperty({
    enum: ["JsonWebSignature2020", "DataIntegrityProof"],
    example: "JsonWebSignature2020"
  })
  type!: "JsonWebSignature2020" | "DataIntegrityProof";

  @ApiProperty({ example: "assertionMethod" })
  proofPurpose!: string;
}

export class JsonWebSignature2020 extends Proof {
  @ApiProperty({
    enum: ["JsonWebSignature2020"],
    example: "JsonWebSignature2020"
  })
  @IsString()
  declare type: "JsonWebSignature2020";

  @ApiProperty({ example: "2020-01-01T00:00:00Z" })
  @IsDateString()
  created!: string;

  @ApiProperty({ example: "assertionMethod" })
  @IsString()
  declare proofPurpose: string;

  @ApiProperty({ example: "eyJhbGciOiJFUzI1NiIsInR5cCI..." })
  @IsString()
  jws!: string;

  @ApiProperty({ example: "did:example:123456#key-1" })
  @IsString()
  verificationMethod!: string;
}

export class DataIntegrityProof extends Proof {
  @ApiPropertyOptional({
    example: "did:example:xyz#proof-1"
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({
    enum: ["DataIntegrityProof"],
    example: "DataIntegrityProof"
  })
  @IsString()
  declare type: "DataIntegrityProof";

  @ApiProperty({ example: "assertionMethod" })
  @IsString()
  declare proofPurpose: string;

  @ApiPropertyOptional({ example: "did:example:author#verificationKey" })
  @IsString()
  @IsOptional()
  verificationMethod?: string;

  @ApiProperty({ example: "ecdsa-2019" })
  @IsString()
  cryptosuite!: string;

  @ApiPropertyOptional({ example: "2021-01-01T00:00:00Z" })
  @IsDateString()
  @IsOptional()
  created?: string;

  @ApiPropertyOptional({ example: "2022-01-01T00:00:00Z" })
  @IsDateString()
  @IsOptional()
  expires?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ["example.com"]
  })
  @IsString({ each: true })
  @IsOptional()
  domain?: OrArray<string>;

  @ApiPropertyOptional({ example: "1234567890" })
  @IsString()
  @IsOptional()
  challenge?: string;

  @ApiProperty({ example: "ProofValueString" })
  @IsString()
  proofValue!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ["PreviousProof1", "PreviousProof2"]
  })
  @IsString({ each: true })
  @IsOptional()
  previousProof?: OrArray<string>;

  @ApiPropertyOptional({ example: "nonce-string" })
  @IsString()
  @IsOptional()
  nonce?: string;
}

export class CredentialSubject {
  @ApiProperty({ example: "did:example:subject-1" })
  @IsString()
  id!: string;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
}

export class BitstringStatusList extends CredentialSubject {
  @ApiProperty({
    enum: ["BitstringStatusList"],
    example: "BitstringStatusList"
  })
  @IsEnum(["BitstringStatusList"])
  type!: "BitstringStatusList";

  @ApiProperty({
    type: "string",
    enum: ["refresh", "revocation", "suspension", "message"],
    example: "revocation"
  })
  @IsEnum(["refresh", "revocation", "suspension", "message"])
  statusPurpose!: "refresh" | "revocation" | "suspension" | "message";

  @ApiProperty({ example: "encoded-list-string" })
  @IsString()
  encodedList!: string;

  @ApiPropertyOptional({ example: 3600 })
  @IsNumber()
  ttl!: number;
}

export class CredentialStatus {
  @ApiProperty({ example: "did:example:credential-status" })
  @IsString()
  id!: string;

  @ApiProperty({
    enum: ["BitstringStatusListEntry"],
    example: "BitstringStatusListEntry"
  })
  @IsIn(["BitstringStatusListEntry"])
  type!: "BitstringStatusListEntry";

  @ApiProperty({
    enum: ["refresh", "revocation", "suspension", "message"],
    example: "suspension"
  })
  @IsIn(["refresh", "revocation", "suspension", "message"])
  statusPurpose!: "refresh" | "revocation" | "suspension" | "message";

  @ApiProperty({ example: "0" })
  @IsString()
  statusListIndex!: string;

  @ApiProperty({ example: "did:example:status-credential" })
  @IsString()
  statusListCredential!: string;

  @ApiPropertyOptional({ example: "10" })
  @IsNumberString()
  @IsOptional()
  statusSize?: string;

  @ApiPropertyOptional({
    type: () => [StatusMessage],
    example: [{ status: "deadbeef", message: "Status message detail" }]
  })
  @ValidateNested()
  @Type(() => StatusMessage)
  @IsOptional()
  statusMessage?: Array<StatusMessage>;

  @ApiPropertyOptional({ example: "https://example.com/status" })
  @IsUrl()
  @IsOptional()
  statusReference?: string;
}

export class StatusMessage {
  @ApiProperty({ example: "deadbeef" })
  @IsHexadecimal()
  status!: string;

  @ApiProperty({ example: "Status message detail" })
  @IsString()
  message!: string;
}

@ApiExtraModels(CredentialStatus)
export class Credential<T extends CredentialSubject = CredentialSubject> {
  @ApiProperty({
    type: [String],
    enum: [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/ns/credentials/v2",
      "https://w3id.org/security/suites/jws-2020/v1",
      "https://w3id.org/security/data-integrity/v2",
      "string"
    ],
    example: ["https://www.w3.org/2018/credentials/v1"]
  })
  @IsString({ each: true })
  "@context": string[];

  @ApiProperty({
    type: [String],
    example: ["VerifiableCredential", "TestCredential"]
  })
  @IsString({ each: true })
  type!: string[];

  @ApiPropertyOptional({ example: "http://example.edu/credentials/1872" })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({
    type: () => CredentialSubject,
    additionalProperties: true,
    example: { id: "did:example:subject-1", customProp: "value" }
  })
  @ValidateNested()
  @Type(() => CredentialSubject)
  credentialSubject!: OrArray<T>;

  @ApiProperty({ example: "did:example:issuer" })
  @IsString()
  issuer!: string;

  @ApiPropertyOptional({ example: "2020-01-01T00:00:00Z" })
  @IsString()
  @IsOptional()
  issuanceDate?: string;

  @ApiPropertyOptional({ example: "2030-01-01T00:00:00Z" })
  @IsString()
  @IsOptional()
  expirationDate?: string;

  @ApiPropertyOptional({ example: "2020-01-01T00:00:00Z" })
  @IsString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ example: "2030-01-01T00:00:00Z" })
  @IsString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
    example: { type: "DocumentVerification", verifier: "did:example:verifier" }
  })
  @IsOptional()
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  evidence?: any;

  @ApiPropertyOptional(
    elementOrArray({ $ref: getSchemaPath(CredentialStatus) })
  )
  @ValidateNested()
  @Type(() => CredentialStatus)
  @IsOptional()
  credentialStatus?: OrArray<CredentialStatus>;
}

export class VerifiableCredential<
  P extends Proof = Proof,
  T extends CredentialSubject = CredentialSubject
> extends Credential<T> {
  @ApiProperty({
    type: () => [Proof],
    example: [
      {
        type: "JsonWebSignature2020",
        created: "2020-01-01T00:00:00Z",
        proofPurpose: "assertionMethod",
        jws: "eyJhbGciOiJFUzI1NiIsInR5cCI...",
        verificationMethod: "did:example:123456#key-1"
      }
    ]
  })
  @ValidateNested()
  @Type(() => Proof, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: JsonWebSignature2020, name: "JsonWebSignature2020" },
        { value: DataIntegrityProof, name: "DataIntegrityProof" }
      ]
    },
    keepDiscriminatorProperty: true
  })
  proof!: OrArray<P>;
}
