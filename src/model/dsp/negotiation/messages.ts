import { IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { Serializable, Namespace } from "../../decorators";
import { IReference, Multilanguage, Reference, SerializableClass } from "../common";
import { ContractNegotiationState, ContractAgreementMessageDto, ContractAgreementVerificationMessageDto, ContractNegotiationDto, ContractNegotiationErrorDto, ContractNegotiationEventMessageDto, ContractNegotiationTerminationMessageDto, ContractOfferMessageDto, ContractRequestMessageDto, NegotiationEvent, ProofTypes } from "./messages.dto";
import { Agreement, Offer } from "./negotiation";

export interface IContractRequestMessage {
  processId: string;
  offer: Offer;
  callbackAddress: string;
  dataSet: string;
}

@Serializable("dspace:ContractRequestMessage")
export class ContractRequestMessage extends SerializableClass<ContractRequestMessageDto> {
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  processId: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsNotEmpty()
  offer: Offer;
  @Namespace("dspace")
  @IsNotEmpty()
  callbackAddress: string;
  @Namespace("dspace")
  @IsNotEmpty()
  dataSet: string;

  constructor (value: IContractRequestMessage) {
    super()
    this.processId = value.processId;
    this.offer = value.offer;
    this.callbackAddress = value.callbackAddress;
    this.dataSet = value.dataSet;
  }
}

export interface IContractOfferMessage {
  processId: string;
  offer: Offer;
  callbackAddress: string;
}

@Serializable("dspace:ContractOfferMessage")
export class ContractOfferMessage extends SerializableClass<ContractOfferMessageDto> {
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
export class ContractNegotiationTerminationMessage extends SerializableClass<ContractNegotiationTerminationMessageDto>
{
  @Namespace("dspace")
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  @IsString()
  @IsOptional()
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

export interface IContractNegotiation extends IReference {
  processId: string;
  contractNegotiationState: ContractNegotiationState
}

@Serializable("dspace:ContractNegotiation")
export class ContractNegotiation extends Reference<ContractNegotiationDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  @IsNotEmpty()
  contractNegotiationState: ContractNegotiationState;

  constructor (value: IContractNegotiation) {
    super(value)
    this.processId = value.processId;
    this.contractNegotiationState = value.contractNegotiationState;
  }
}


export interface IContractNegotiationEventMessage {
  processId: string;
  eventType: NegotiationEvent;
}

@Serializable("dspace:ContractNegotiationEventMessage")
export class ContractNegotiationEventMessage extends SerializableClass<ContractNegotiationEventMessageDto>
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
export class ContractNegotiationError extends SerializableClass<ContractNegotiationErrorDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  @ValidateNested()
  @IsOptional()
  reason?: Array<Multilanguage>;
  @Namespace("dct")
  @IsString({each: true})
  @IsOptional()
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface IContractAgreementVerificationMessage {
  processId: string;
  credentialSubject: {
    "dspace:hash": string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  proof: Proof;
}

@Serializable("dspace:ContractAgreementVerificationMessage")
export class ContractAgreementVerificationMessage extends SerializableClass<ContractAgreementVerificationMessageDto>
{
  @Namespace("dspace")
  @IsNotEmpty()
  processId: string;
  @Namespace("cred")
  @IsNotEmpty()
  credentialSubject: {
    "dspace:hash": string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export class ContractAgreementMessage extends SerializableClass<ContractAgreementMessageDto> {
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
