import { Serializable, Namespace } from "../../decorators";
import { Multilanguage, SerializableClass, Time } from "../common";
import { Agreement, Offer } from "./negotiation";

export interface IContractRequestMessage {
  processId: string;
  offer: Offer;
  callbackAddress: string;
}

@Serializable("dspace:ContractRequestMessage")
export class ContractRequestMessage extends SerializableClass {
  @Namespace("dspace")
  processId: string;
  @Namespace("dspace")
  offer: Offer;
  @Namespace("dspace")
  callbackAddress: string;

  constructor(value: IContractRequestMessage) {
    super()
    this.processId = value.processId;
    this.offer = value.offer;
    this.callbackAddress = value.callbackAddress;
  }
}

export interface IContractOfferMessage {
  processId: string;
  offer: Offer;
  callbackAddress: string;
}

@Serializable("dspace:ContractOfferMessage")
export class ContractOfferMessage extends SerializableClass {
  @Namespace("dspace")
  processId: string;
  @Namespace("dspace")
  offer: Offer;
  @Namespace("dspace")
  callbackAddress: string;

  constructor(value: IContractOfferMessage) {
    super()
    this.processId = value.processId;
    this.offer = value.offer;
    this.callbackAddress = value.callbackAddress;
  }
}

export interface IContractNegotiationTerminationMessage {
  processId: string;
  code?: string;
  reason: Array<Multilanguage>;
}

@Serializable("dspace:ContractNegotiationTerminationMessage")
export class ContractNegotiationTerminationMessage extends SerializableClass
{
  @Namespace("dspace")
  processId: string;
  @Namespace("dspace")
  code?: string;
  @Namespace("dspace")
  reason: Array<Multilanguage>;

  constructor(value: IContractNegotiationTerminationMessage) {
    super();
    this.processId = value.processId;
    this.code = value.code;
    this.reason = value.reason;
  }
}

export interface IContractNegotiation {
  processId: string;
  negotiationId: string;
}

@Serializable("dspace:ContractNegotiation")
export class ContractNegotiation extends SerializableClass {
  @Namespace("dspace")
  processId: string;
  @Namespace("dspace")
  negotiationId: string;

  constructor(value: IContractNegotiation) {
    super()
    this.processId = value.processId;
    this.negotiationId = value.negotiationId;
  }
}

export enum NegotiationEvent {
  ACCEPTED = "dspace:ACCEPTED",
  FINALIZED = "dspace:FINALIZED",
}

export interface IContractNegotiationEventMessage {
  processId: string;
  eventType: NegotiationEvent;
}

@Serializable("dspace:ContractNegotiationEventMessage")
export class ContractNegotiationEventMessage extends SerializableClass
{
  @Namespace("dspace")
  processId: string;
  @Namespace("dspace")
  eventType: NegotiationEvent;

  constructor(value: IContractNegotiationEventMessage) {
    super();
    this.processId = value.processId;
    this.eventType = value.eventType;
  }
}

export interface IContractNegotiationError {
  processId: string;
  reason?: Array<Multilanguage>;
  description?: Array<string>;
}

@Serializable("dspace:ContractNegotiationError")
export class ContractNegotiationError extends SerializableClass {
  @Namespace("dspace")
  processId: string;
  @Namespace("dspace")
  reason?: Array<Multilanguage>;
  @Namespace("dct")
  description?: Array<string>;

  constructor(value: IContractNegotiationError) {
    super()
    this.processId = value.processId;
    this.reason = value.reason;
    this.description = value.description;
  }
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
export interface Proof {
  "@type": ProofTypes;
  "dct:created": Time;
  "sec:jws": string;
  [key: string]: any;
}

export interface IContractAgreementVerificationMessage {
  processId: string;
  credentialSubject: {
    "dspace:hash": string;
    [key: string]: any;
  };
  proof: Proof;
}

@Serializable("dspace:ContractAgreementVerificationMessage")
export class ContractAgreementVerificationMessage extends SerializableClass
{
  @Namespace("dspace")
  processId: string;
  @Namespace("cred")
  credentialSubject: {
    "dspace:hash": string;
    [key: string]: any;
  };
  @Namespace("dct")
  proof: Proof;

  constructor(value: IContractAgreementVerificationMessage) {
    super();
    this.processId = value.processId;
    this.credentialSubject = value.credentialSubject;
    this.proof = value.proof;
  }
}

export interface IContractAgreementMessage {
  processId: string;
  agreement: Agreement;
}

@Serializable("dspace:ContractAgreementMessage")
export class ContractAgreementMessage extends SerializableClass {
  @Namespace("dspace")
  processId: string;
  @Namespace("odrl")
  agreement: Agreement;

  constructor(value: IContractAgreementMessage) {
    super()
    this.processId = value.processId;
    this.agreement = value.agreement;
  }
}
