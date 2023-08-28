import { VerifiableCredential, CredentialSubject } from "./credentials";


export interface VerifiablePresentation<T extends VerifiableCredential<CredentialSubject>> {
  '@context': string[]
  '@type': string[]
  '@id'?: string
  verifiableCredential: T[];
}

export interface VerifiablePresentationJwt {
  vp: string;
}

export interface VerifiablePresentationJsonLd {
  vp: VerifiablePresentation<VerifiableCredential<CredentialSubject>>;
}

export interface PresentationValidation extends VerifiablePresentationJwt {
  valid: boolean
  validateJWTSignature: boolean;
  validateJWTExpiryDate: boolean;
  validateTrustAnchors: Array<boolean>
  validateExpiryDate: Array<boolean | "undefined">;
  validateCredentials: Array<boolean>;
  validateAudience?: boolean;
}