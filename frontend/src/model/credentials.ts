
export interface Signature {
  type: string;
  created: string;
  proofPurpose: string;
  jws: string;
  verificationMethod: string;
}

export interface CredentialSubject {
  id: string
  type?: string[]
  [key: string]: any
}

export interface Credential<T extends CredentialSubject> {
  '@context': string[]
  type: string[]
  id?: string
  credentialSubject: T
  issuer: string
  expirationDate?: string
  issuanceDate: string
}

export interface VerifiableCredential<T extends CredentialSubject> extends Credential<T> {
  proof: Signature;
}

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