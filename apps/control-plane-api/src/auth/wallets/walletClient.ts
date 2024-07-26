import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
} from "@tsg-dsp/common-dsp";

export interface ValidationResult {
  [key: string]: boolean | boolean[];
}

export interface Credential {
  id: string;
  targetDid: string;
  credential: VerifiableCredential<CredentialSubject>;
  selfIssued: boolean;
}

export abstract class WalletClient {
  abstract requestVerifiablePresentation(audience: string): Promise<string>;
  abstract requestValidation(
    token: string,
    audience: string
  ): Promise<
    VerifiablePresentation<VerifiableCredential<CredentialSubject>> | undefined
  >;
  abstract getCredentials(): Promise<Credential[]>;
}
