import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsIn, IsObject, IsString } from "class-validator";
import { JWK } from "jose";

export class KeyInfo {
  @IsString()
  id!: string;

  @IsString()
  @IsIn(["EdDSA", "ES384", "X509"])
  type!: "EdDSA" | "ES384" | "X509";

  @IsBoolean()
  default!: boolean;

  @IsObject()
  publicKey!: JWK;

  @IsDate()
  @Type(() => Date)
  createdDate!: Date;

  @IsDate()
  @Type(() => Date)
  modifiedDate!: Date;
}

export interface TrustAnchorConfig {
  id: string;
  credentialTypes: string[];
}

export interface IssueConfiguration {
  id?: string;
  credentialType: string;
  proofType: "jwt" | "ldp";
  documentUrl?: string;
  document: Record<string, any>;
  schema?: Record<string, any>;
  name?: string;
  description?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  textColor?: string;
}

export interface CredentialConfig {
  trustAnchors: TrustAnchorConfig[];
  issueConfigurations: IssueConfiguration[];
}
