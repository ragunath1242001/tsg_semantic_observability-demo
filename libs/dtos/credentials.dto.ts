import { IsBoolean, IsDate, IsIn, IsObject, IsString } from "class-validator";
import { JWK } from "jose";

export class KeyInfo {
  @IsString()
  id!: string

  @IsString()
  @IsIn(['EdDSA','ES384','X509'])
  type!: 'EdDSA' | 'ES384' | 'X509'

  @IsBoolean()
  default!: boolean

  @IsObject()
  publicKey!: JWK

  @IsDate()
  created!: Date

  @IsDate()
  modified!: Date
}

export interface TrustAnchorConfig {
  identifier: string;
  credentialTypes: string[];
}

export interface JsonLdContextConfig {
  id: string;
  credentialType: string;
  issuable: boolean;
  documentUrl?: string;
  document: Record<string, any>;
  schema?: Record<string, any>;
}

export interface CredentialConfig {
  trustAnchors: TrustAnchorConfig[],
  contexts: JsonLdContextConfig[]
}