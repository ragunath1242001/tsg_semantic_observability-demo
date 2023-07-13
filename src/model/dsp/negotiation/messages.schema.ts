import { LDMultilanguage, LDTime } from "../common.schema";
import { LDAgreement, LDOffer } from "./negotiation.schema";


export interface LDContractRequestMessage {
  '@type': 'dspace:ContractRequestMessage'
  'dspace:processId': string;
  'odrl:offer': LDOffer;
  'dspace:callbackAddress': string;
}

export interface LDContractOfferMessage {
  '@type': 'dspace:ContractOfferMessage'
  'dspace:processId': string;
  'odrl:offer': LDOffer;
  'dspace:callbackAddress': string;
}
export interface LDContractNegotiationTerminationMessage {
  '@type': 'dspace:ContractNegotiationTerminationMessage'
  'dspace:processId': string;
  'dspace:code'?: string;
  'dspace:reason': Array<LDMultilanguage>;
}
export interface LDContractNegotiation {
  '@type': 'dspace:ContractNegotiation'
  'dspace:processId': string;
  'dspace:negotiationId': string;
}
export enum NegotiationEvent {
  ACCEPTED = "dspace:ACCEPTED",
  FINALIZED = "dspace:FINALIZED",
}
export interface LDContractNegotiationEventMessage {
  '@type': 'dspace:ContractNegotiationEventMessage'
  'dspace:processId': string;
  'dspace:eventType': NegotiationEvent;
}
export interface LDContractNegotiationError {
  '@type': 'dspace:ContractNegotiationError'
  'dspace:processId': string;
  'dspace:reason'?: Array<LDMultilanguage>;
  'dct:description'?: Array<string>;
}
export enum ProofTypes {
  EcdsaSecp256k1Signature2019 = "sec:EcdsaSecp256k1Signature2019",
  EcdsaSecp256k1RecoverySignature2020 = "sec:EcdsaSecp256k1RecoverySignature2020",
  RsaSignature2018 = "sec:RsaSignature2018",
  SchnorrSecp256k1Signature2019 = "sec:SchnorrSecp256k1Signature2019",
  MerkleProof2019 = "sec:MerkleProof2019",
  Ed25519Signature2020 = "sec:Ed25519Signature2020",
  JsonWebSignature2020 = "sec:JsonWebSignature2020",
  BbsBlsSignature2020 = "sec:BbsBlsSignature2020",
  BbsBlsSignatureProof2020 = "sec:BbsBlsSignatureProof2020",
}
export interface LDProof {
  "@type": ProofTypes;
  "dct:created": LDTime;
  "sec:jws": string;
  [key: string]: any;
}
export interface LDContractAgreementVerificationMessage {
  '@type': 'dspace:ContractAgreementVerificationMessage'
  'dspace:processId': string;
  'cred:credentialSubject': {
    "dspace:hash": string;
    [key: string]: any;
  };
  'sec:proof': LDProof;
}
export interface LDContractAgreementMessage {
  '@type': 'dspace:ContractAgreementMessage'
  'dspace:processId': string;
  'dspace:agreement': LDAgreement;
}