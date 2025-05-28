import { ContextDto, MultilanguageDto, ReferenceDto } from "../common.dto.js";
import { AgreementDto, OfferDto } from "./negotiation.dto.js";

export interface ContractRequestMessageDto extends ContextDto {
  "@type": "ContractRequestMessage";
  consumerPid: string;
  providerPid?: string;
  callbackAddress: string;
  offer: OfferDto;
}

export interface ContractOfferMessageDto extends ContextDto {
  "@type": "ContractOfferMessage";
  consumerPid?: string;
  providerPid: string;
  offer: OfferDto;
  callbackAddress: string;
}

export interface ContractNegotiationTerminationMessageDto extends ContextDto {
  "@type": "ContractNegotiationTerminationMessage";
  consumerPid: string;
  providerPid: string;
  code?: string;
  reason: Array<any>;
}

export enum ContractNegotiationState {
  REQUESTED = "REQUESTED",
  OFFERED = "OFFERED",
  ACCEPTED = "ACCEPTED",
  AGREED = "AGREED",
  VERIFIED = "VERIFIED",
  FINALIZED = "FINALIZED",
  TERMINATED = "TERMINATED"
}

export interface ContractNegotiationDto extends ContextDto, ReferenceDto {
  "@type": "ContractNegotiation";
  consumerPid: string;
  providerPid: string;
  state: ContractNegotiationState;
}

export enum NegotiationEvent {
  ACCEPTED = "ACCEPTED",
  FINALIZED = "FINALIZED"
}

export interface ContractNegotiationEventMessageDto extends ContextDto {
  "@type": "ContractNegotiationEventMessage";
  consumerPid: string;
  providerPid: string;
  eventType: NegotiationEvent;
  hashedMessage?: HashedMessage;
}

export interface ContractNegotiationErrorDto extends ContextDto {
  "@type": "ContractNegotiationError";
  consumerPid: string;
  providerPid: string;
  reason?: Array<any>;
  description?: Array<MultilanguageDto>;
}

export interface HashedMessage {
  digest: string;
  algorithm: string;
}

export interface ContractAgreementVerificationMessageDto extends ContextDto {
  "@type": "ContractAgreementVerificationMessage";
  consumerPid: string;
  providerPid: string;
  hashedMessage?: HashedMessage;
}

export interface ContractAgreementMessageDto extends ContextDto {
  "@type": "ContractAgreementMessage";
  consumerPid: string;
  providerPid: string;
  agreement: AgreementDto;
  callbackAddress: string;
}
