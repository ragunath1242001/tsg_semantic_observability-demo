import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common";

export interface Credentials {
  id: string;
  targetDid: string;
  credential: VerifiableCredential<CredentialSubject>
  selfIssued: boolean
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