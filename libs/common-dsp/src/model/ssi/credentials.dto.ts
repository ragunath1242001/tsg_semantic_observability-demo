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
import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath
} from "@nestjs/swagger";
import { elementOrArray, OrArray } from "../../utils/unions.js";

export abstract class Proof {
  @ApiProperty({ enum: ["JsonWebSignature2020", "DataIntegrityProof"] })
  type!: "JsonWebSignature2020" | "DataIntegrityProof";

  @ApiProperty()
  proofPurpose!: string;
}

export class JsonWebSignature2020 extends Proof {
  @ApiProperty({ enum: ["JsonWebSignature2020"] })
  @IsString()
  declare type: "JsonWebSignature2020";

  @ApiProperty()
  @IsDateString()
  created!: string;

  @ApiProperty()
  @IsString()
  declare proofPurpose: string;

  @ApiProperty()
  @IsString()
  jws!: string;

  @ApiProperty()
  @IsString()
  verificationMethod!: string;
}

export class DataIntegrityProof extends Proof {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ enum: ["DataIntegrityProof"] })
  @IsString()
  declare type: "DataIntegrityProof";

  @ApiProperty()
  @IsString()
  declare proofPurpose: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  verificationMethod?: string;

  @ApiProperty()
  @IsString()
  cryptosuite!: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  created?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expires?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsString({ each: true })
  @IsOptional()
  domain?: OrArray<string>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  challenge?: string;

  @ApiProperty()
  @IsString()
  proofValue!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsString({ each: true })
  @IsOptional()
  previousProof?: OrArray<string>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nonce?: string;
}

export class CredentialSubject {
  @ApiProperty()
  @IsString()
  id!: string;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
}

export class BitstringStatusList extends CredentialSubject {
  @ApiProperty({ enum: ["BitstringStatusList"] })
  @IsEnum(["BitstringStatusList"])
  type!: "BitstringStatusList";

  @ApiProperty({
    type: "string",
    enum: ["refresh", "revocation", "suspension", "message"]
  })
  @IsEnum(["refresh", "revocation", "suspension", "message"])
  statusPurpose!: "refresh" | "revocation" | "suspension" | "message";

  @ApiProperty({ type: "string" })
  @IsString()
  encodedList!: string;

  @ApiPropertyOptional()
  @IsNumber()
  ttl!: number;
}

export class CredentialStatus {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ enum: ["BitstringStatusListEntry"] })
  @IsIn(["BitstringStatusListEntry"])
  type!: "BitstringStatusListEntry";

  @ApiProperty({ enum: ["refresh", "revocation", "suspension", "message"] })
  @IsIn(["refresh", "revocation", "suspension", "message"])
  statusPurpose!: "refresh" | "revocation" | "suspension" | "message";

  @ApiProperty()
  @IsString()
  statusListIndex!: string;

  @ApiProperty()
  @IsString()
  statusListCredential!: string;

  @ApiPropertyOptional()
  @IsNumberString()
  @IsOptional()
  statusSize?: string;

  @ApiPropertyOptional({ type: () => [StatusMessage] })
  @ValidateNested()
  @Type(() => StatusMessage)
  @IsOptional()
  statusMessage?: Array<StatusMessage>;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  statusReference?: string;
}

export class StatusMessage {
  @ApiProperty()
  @IsHexadecimal()
  status!: string;

  @ApiProperty()
  @IsString()
  message!: string;
}

export class Credential<T extends CredentialSubject = CredentialSubject> {
  @ApiProperty({
    type: [String],
    enum: [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/ns/credentials/v2",
      "https://w3id.org/security/suites/jws-2020/v1",
      "https://w3id.org/security/data-integrity/v2",
      "string"
    ]
  })
  @IsString({ each: true })
  "@context": string[];

  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  type!: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ type: () => CredentialSubject, additionalProperties: true })
  @ValidateNested()
  @Type(() => CredentialSubject)
  credentialSubject!: OrArray<T>;

  @ApiProperty()
  @IsString()
  issuer!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  issuanceDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  expirationDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
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
  @ApiProperty({ type: () => [Proof] })
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
