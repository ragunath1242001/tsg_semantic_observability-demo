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

import { elementOrArray, OrArray, toArray } from "../../utils/unions.js";

export class DataIntegrityProof {
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
  type!: "DataIntegrityProof";

  @ApiProperty({ example: "assertionMethod" })
  @IsString()
  proofPurpose!: string;

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
  ttl?: number;
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
    enum: ["https://www.w3.org/ns/credentials/v2", "string"],
    example: ["https://www.w3.org/ns/credentials/v2"]
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

export class CredentialContainer<
  T extends CredentialSubject = CredentialSubject
> {
  @ApiProperty({
    type: () => Credential,
    example: {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential"],
      credentialSubject: { id: "did:example:subject-1" },
      issuer: "did:example:issuer",
      validFrom: "2020-01-01T00:00:00Z",
      proof: {
        type: "DataIntegrityProof",
        created: "2020-01-01T00:00:00Z",
        proofPurpose: "assertionMethod",
        cryptosuite: "eddsa-jcs-2022",
        proofValue: "",
        verificationMethod: "did:example:123456#key-1"
      }
    }
  })
  @ValidateNested()
  @Type(() => Credential)
  credential!: Credential<T>;

  @ApiProperty({
    type: String,
    example:
      "eyJraWQiOiJFeEhrQk1XOWZtYmt2VjI2Nm1ScHVQMnNVWV9OX0VXSU4xbGFwVXpPOHJvIiwiYWxnIjoiRVMyNTYifQ.eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvbnMvY3JlZGVudGlhbHMvdjIiLCJodHRwczovL3d3dy53My5vcmcvbnMvY3JlZGVudGlhbHMvZXhhbXBsZXMvdjIiXSwiaWQiOiJodHRwOi8vdW5pdmVyc2l0eS5leGFtcGxlL2NyZWRlbnRpYWxzLzM3MzIiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiRXhhbXBsZURlZ3JlZUNyZWRlbnRpYWwiXSwiaXNzdWVyIjoiaHR0cHM6Ly91bml2ZXJzaXR5LmV4YW1wbGUvaXNzdWVycy81NjUwNDkiLCJ2YWxpZEZyb20iOiIyMDEwLTAxLTAxVDAwOjAwOjAwWiIsImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmV4YW1wbGU6ZWJmZWIxZjcxMmViYzZmMWMyNzZlMTJlYzIxIiwiZGVncmVlIjp7InR5cGUiOiJFeGFtcGxlQmFjaGVsb3JEZWdyZWUiLCJuYW1lIjoiQmFjaGVsb3Igb2YgU2NpZW5jZSBhbmQgQXJ0cyJ9fX0.YEsG9at9Hnt_j-UykCrnl494fcYMTjzpgvlK0KzzjvfmZmSg-sNVJqMZWizYhWv_eRUvAoZohvSJWeagwj_Ajw"
  })
  @IsString()
  @IsOptional()
  jwt?: string;

  @ApiProperty({
    type: () => [DataIntegrityProof],
    example: [
      {
        type: "DataIntegrityProof",
        created: "2020-01-01T00:00:00Z",
        proofPurpose: "assertionMethod",
        cryptosuite: "eddsa-jcs-2022",
        proofValue: "",
        verificationMethod: "did:example:123456#key-1"
      }
    ]
  })
  @ValidateNested()
  @Type(() => DataIntegrityProof)
  @IsOptional()
  proof?: OrArray<DataIntegrityProof>;
}

export class EnvelopedVerifiableCredential {
  @ApiProperty({
    type: [String],
    items: { enum: ["https://www.w3.org/ns/credentials/v2"] }
  })
  "@context": ["https://www.w3.org/ns/credentials/v2"];
  @ApiProperty({ type: String, example: "data:application/vc+jwt,..." })
  @IsString()
  id!: string;
  @ApiProperty({
    type: [String],
    items: { enum: ["EnvelopedVerifiableCredential"] }
  })
  type!: ["EnvelopedVerifiableCredential"];
}

export function isEnvelopedVerifiableCredential(
  credential: VerifiableCredential | EnvelopedVerifiableCredential
): credential is EnvelopedVerifiableCredential {
  return (
    toArray(credential["@context"]).includes(
      "https://www.w3.org/ns/credentials/v2"
    ) && toArray(credential.type).includes("EnvelopedVerifiableCredential")
  );
}

export class VerifiableCredential<
  T extends CredentialSubject = CredentialSubject
> extends Credential<T> {
  @ApiProperty({
    type: () => [DataIntegrityProof],
    example: [
      {
        type: "DataIntegrityProof",
        created: "2020-01-01T00:00:00Z",
        proofPurpose: "assertionMethod",
        cryptosuite: "eddsa-jcs-2022",
        proofValue: "",
        verificationMethod: "did:example:123456#key-1"
      }
    ]
  })
  @ValidateNested()
  @Type(() => DataIntegrityProof)
  proof!: OrArray<DataIntegrityProof>;
}
