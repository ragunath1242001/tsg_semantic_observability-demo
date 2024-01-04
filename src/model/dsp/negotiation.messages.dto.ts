import { ContextDto, MultilanguageDto, ReferenceDto } from "./common.dto";
import { AgreementDto, OfferDto } from "./negotiation.dto";


export interface ContractRequestMessageDto extends ContextDto {
  '@type': 'dspace:ContractRequestMessage'
  'dspace:processId': string;
  'odrl:offer': OfferDto;
  'dspace:callbackAddress': string;
  'dspace:dataSet': string;
}

export interface ContractOfferMessageDto extends ContextDto {
  '@type': 'dspace:ContractOfferMessage'
  'dspace:processId': string;
  'odrl:offer': OfferDto;
  'dspace:callbackAddress': string;
}
export interface ContractNegotiationTerminationMessageDto extends ContextDto {
  '@type': 'dspace:ContractNegotiationTerminationMessage'
  'dspace:processId': string;
  'dspace:code'?: string;
  'dspace:reason': Array<MultilanguageDto | string>;
}

export enum ContractNegotiationState {
  REQUESTED = "dspace:REQUESTED",
  OFFERED = "dspace:OFFERED",
  ACCEPTED = "dspace:ACCEPTED",
  AGREED = "dspace:AGREED",
  VERIFIED = "dspace:VERIFIED",
  FINALIZED = "dspace:FINALIZED",
  TERMINATED = "dspace:TERMINATED"
}

export interface ContractNegotiationDto extends ContextDto, ReferenceDto {
  '@type': 'dspace:ContractNegotiation'
  'dspace:processId': string;
  'dspace:contractNegotiationState': ContractNegotiationState
}
export enum NegotiationEvent {
  ACCEPTED = "dspace:ACCEPTED",
  FINALIZED = "dspace:FINALIZED",
}
export interface ContractNegotiationEventMessageDto extends ContextDto {
  '@type': 'dspace:ContractNegotiationEventMessage'
  'dspace:processId': string;
  'dspace:eventType': NegotiationEvent;
}
export interface ContractNegotiationErrorDto extends ContextDto {
  '@type': 'dspace:ContractNegotiationError'
  'dspace:processId': string;
  'dspace:reason'?: Array<MultilanguageDto | string>;
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
export interface ProofDto {
  "@type": ProofTypes;
  "dct:created": string;
  "sec:jws": string;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  [key: string]: any;
}
export interface ContractAgreementVerificationMessageDto extends ContextDto {
  '@type': 'dspace:ContractAgreementVerificationMessage'
  'dspace:processId': string;
  'cred:credentialSubject': {
    "dspace:hash": string;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    [key: string]: any;
  };
  'sec:proof': ProofDto;
}
export interface ContractAgreementMessageDto extends ContextDto {
  '@type': 'dspace:ContractAgreementMessage'
  'dspace:processId': string;
  'odrl:agreement': AgreementDto;
}