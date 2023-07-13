import { IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { Serializable, Namespace } from "../../decorators";
import { Multilanguage, SerializableClass } from "../common";
import { NegotiationEvent, ProofTypes } from "./messages.schema";
import { Agreement, Offer } from "./negotiation";

export interface IContractRequestMessage {
  processId: string;
  offer: Offer;
  callbackAddress: string;
}

@Serializable("dspace:ContractRequestMessage")
export class ContractRequestMessage extends SerializableClass {
  @Namespace("dspace")
  @IsNotEmpty()
  processId: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsNotEmpty()
  offer: Offer;
  @Namespace("dspace")
  @IsNotEmpty()
  callbackAddress: string;

  constructor (value: IContractRequestMessage) {
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
  @IsNotEmpty()
  processId: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsNotEmpty()
  offer: Offer;
  @Namespace("dspace")
  @IsNotEmpty()
  callbackAddress: string;

  constructor (value: IContractOfferMessage) {
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
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  code?: string;
  @Namespace("dspace")
  @ValidateNested()
  reason: Array<Multilanguage>;

  constructor (value: IContractNegotiationTerminationMessage) {
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
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  @IsNotEmpty()
  negotiationId: string;

  constructor (value: IContractNegotiation) {
    super()
    this.processId = value.processId;
    this.negotiationId = value.negotiationId;
  }
}


export interface IContractNegotiationEventMessage {
  processId: string;
  eventType: NegotiationEvent;
}

@Serializable("dspace:ContractNegotiationEventMessage")
export class ContractNegotiationEventMessage extends SerializableClass
{
  @Namespace("dspace")
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  @IsNotEmpty()
  eventType: NegotiationEvent;

  constructor (value: IContractNegotiationEventMessage) {
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
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  @ValidateNested()
  reason?: Array<Multilanguage>;
  @Namespace("dct")
  @IsString({each: true})
  description?: Array<string>;

  constructor (value: IContractNegotiationError) {
    super()
    this.processId = value.processId;
    this.reason = value.reason;
    this.description = value.description;
  }
}

export interface Proof {
  "@type": ProofTypes;
  "dct:created": string;
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
  @IsNotEmpty()
  processId: string;
  @Namespace("cred")
  @IsNotEmpty()
  credentialSubject: {
    "dspace:hash": string;
    [key: string]: any;
  };
  @Namespace("sec")
  @IsNotEmpty()
  proof: Proof;

  constructor (value: IContractAgreementVerificationMessage) {
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
  @IsNotEmpty()
  processId: string;
  @Namespace("odrl")
  @IsNotEmpty()
  @ValidateNested()
  agreement: Agreement;

  constructor (value: IContractAgreementMessage) {
    super()
    this.processId = value.processId;
    this.agreement = value.agreement;
  }
}
