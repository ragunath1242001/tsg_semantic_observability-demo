import {
  VerifiableCredential,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import { InputDescriptor } from "@tsg-dsp/common-dtos";
import { DIDDocument } from "did-resolver";

export interface ValidationResult {
  [key: string]: boolean | boolean[];
}

export interface Credential {
  id: string;
  targetDid: string;
  credential: VerifiableCredential;
  selfIssued: boolean;
}

export abstract class WalletClient {
  abstract requestVerifiablePresentation(audience: string): Promise<string>;
  abstract requestValidation(
    token: string,
    audience: string,
    inputDescriptors?: InputDescriptor[]
  ): Promise<VerifiablePresentation[] | undefined>;
  abstract getCredentials(): Promise<Credential[]>;
  abstract requestSignature(document: Record<string, any>): Promise<any>;
  abstract requestSignatureValidation(
    signedDocument: Record<string, any>
  ): Promise<any>;
  abstract resolveDidDocument(didId: string): Promise<DIDDocument>;
}
