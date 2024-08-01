import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Serializable, Namespace } from "../../decorators";
import {
  IReference,
  Multilanguage,
  Reference,
  SerializableClass,
} from "../common";

import { Agreement, Offer } from "./negotiation";
import {
  ContractRequestMessageDto,
  ContractOfferMessageDto,
  ContractNegotiationTerminationMessageDto,
  ContractNegotiationState,
  ContractNegotiationDto,
  NegotiationEvent,
  ContractNegotiationEventMessageDto,
  ContractNegotiationErrorDto,
  HashedMessage,
  ContractAgreementVerificationMessageDto,
  ContractAgreementMessageDto,
} from "./messages.dto";
import { createOptionalInstance } from "../../../utils";

export interface IContractRequestMessage {
  consumerPid: string;
  providerPid?: string;
  offer: Offer;
  callbackAddress: string;
}

@Serializable("dspace:ContractRequestMessage")
export class ContractRequestMessage extends SerializableClass<ContractRequestMessageDto> {
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  consumerPid: string;
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  providerPid?: string;
  @Namespace("dspace")
  @ValidateNested()
  @IsNotEmpty()
  offer: Offer;
  @Namespace("dspace")
  @IsNotEmpty()
  callbackAddress: string;

  constructor(value: IContractRequestMessage) {
    super();
    this.consumerPid = value.consumerPid;
    this.providerPid = value.providerPid;
    this.offer = createOptionalInstance(value.offer, Offer);
    this.callbackAddress = value.callbackAddress;
  }
}

export interface IContractOfferMessage {
  consumerPid?: string;
  providerPid: string;
  offer: Offer;
  callbackAddress: string;
}

@Serializable("dspace:ContractOfferMessage")
export class ContractOfferMessage extends SerializableClass<ContractOfferMessageDto> {
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  consumerPid?: string;
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  providerPid: string;
  @Namespace("dspace")
  @ValidateNested()
  @IsNotEmpty()
  offer: Offer;
  @Namespace("dspace")
  @IsNotEmpty()
  callbackAddress: string;

  constructor(value: IContractOfferMessage) {
    super();
    this.consumerPid = value.consumerPid;
    this.providerPid = value.providerPid;
    this.offer = createOptionalInstance(value.offer, Offer);
    this.callbackAddress = value.callbackAddress;
  }
}

export interface IContractNegotiationTerminationMessage {
  consumerPid: string;
  providerPid: string;
  code?: string;
  reason: Array<any>;
}

@Serializable("dspace:ContractNegotiationTerminationMessage")
export class ContractNegotiationTerminationMessage extends SerializableClass<ContractNegotiationTerminationMessageDto> {
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  consumerPid: string;
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  providerPid: string;
  @Namespace("dspace")
  @IsString()
  @IsOptional()
  code?: string;
  @Namespace("dspace")
  @ValidateNested()
  reason: Array<Multilanguage>;

  constructor(value: IContractNegotiationTerminationMessage) {
    super();
    this.consumerPid = value.consumerPid;
    this.providerPid = value.providerPid;
    this.code = value.code;
    this.reason = value.reason;
  }
}

export interface IContractNegotiation extends IReference {
  consumerPid: string;
  providerPid: string;
  state: ContractNegotiationState;
}

@Serializable("dspace:ContractNegotiation")
export class ContractNegotiation extends Reference<ContractNegotiationDto> {
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  consumerPid: string;
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  providerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  state: ContractNegotiationState;

  constructor(value: IContractNegotiation) {
    super(value);
    this.consumerPid = value.consumerPid;
    this.providerPid = value.providerPid;
    this.state = value.state;
  }
}

export interface IContractNegotiationEventMessage {
  consumerPid: string;
  providerPid: string;
  eventType: NegotiationEvent;
  hashedMessage?: HashedMessage;
}

@Serializable("dspace:ContractNegotiationEventMessage")
export class ContractNegotiationEventMessage extends SerializableClass<ContractNegotiationEventMessageDto> {
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  consumerPid: string;
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  providerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  eventType: NegotiationEvent;
  @Namespace("dspace")
  @IsOptional()
  hashedMessage?: HashedMessage;

  constructor(value: IContractNegotiationEventMessage) {
    super();
    this.consumerPid = value.consumerPid;
    this.providerPid = value.providerPid;
    this.eventType = value.eventType;
    this.hashedMessage = value.hashedMessage;
  }
}

export interface IContractNegotiationError {
  consumerPid: string;
  providerPid: string;
  reason?: Array<any>;
  description?: Array<Multilanguage>;
}

@Serializable("dspace:ContractNegotiationError")
export class ContractNegotiationError extends SerializableClass<ContractNegotiationErrorDto> {
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  consumerPid: string;
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  providerPid: string;
  @Namespace("dspace")
  @ValidateNested()
  @IsOptional()
  reason?: Array<any>;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  description?: Array<Multilanguage>;

  constructor(value: IContractNegotiationError) {
    super();
    this.consumerPid = value.consumerPid;
    this.providerPid = value.providerPid;
    this.reason = value.reason;
    this.description = value.description;
  }
}

export interface IContractAgreementVerificationMessage {
  consumerPid: string;
  providerPid: string;
  hashedMessage: HashedMessage;
}

@Serializable("dspace:ContractAgreementVerificationMessage")
export class ContractAgreementVerificationMessage extends SerializableClass<ContractAgreementVerificationMessageDto> {
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  consumerPid: string;
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  providerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  hashedMessage: HashedMessage;

  constructor(value: IContractAgreementVerificationMessage) {
    super();
    this.consumerPid = value.consumerPid;
    this.providerPid = value.providerPid;
    this.hashedMessage = value.hashedMessage;
  }
}

export interface IContractAgreementMessage {
  consumerPid: string;
  providerPid: string;
  agreement: Agreement;
}

@Serializable("dspace:ContractAgreementMessage")
export class ContractAgreementMessage extends SerializableClass<ContractAgreementMessageDto> {
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  consumerPid: string;
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  providerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  @ValidateNested()
  agreement: Agreement;

  constructor(value: IContractAgreementMessage) {
    super();
    this.consumerPid = value.consumerPid;
    this.providerPid = value.providerPid;
    this.agreement = createOptionalInstance(value.agreement, Agreement);
  }
}
