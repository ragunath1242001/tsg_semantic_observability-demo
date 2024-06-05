import { ContextDto, MultilanguageDto, ReferenceDto } from "../common.dto";
import { AgreementDto, OfferDto } from "./negotiation.dto";

export interface ContractRequestMessageDto extends ContextDto {
  "@type": "dspace:ContractRequestMessage";
  "dspace:consumerPid": string;
  "dspace:providerPid"?: string;
  "dspace:callbackAddress": string;
  "dspace:offer": OfferDto;
}

export interface ContractOfferMessageDto extends ContextDto {
  "@type": "dspace:ContractOfferMessage";
  "dspace:consumerPid"?: string;
  "dspace:providerPid": string;
  "dspace:offer": OfferDto;
  "dspace:callbackAddress": string;
}

export interface ContractNegotiationTerminationMessageDto extends ContextDto {
  "@type": "dspace:ContractNegotiationTerminationMessage";
  "dspace:consumerPid": string;
  "dspace:providerPid": string;
  "dspace:code"?: string;
  "dspace:reason": Array<any>;
}

export enum ContractNegotiationState {
  REQUESTED = "dspace:REQUESTED",
  OFFERED = "dspace:OFFERED",
  ACCEPTED = "dspace:ACCEPTED",
  AGREED = "dspace:AGREED",
  VERIFIED = "dspace:VERIFIED",
  FINALIZED = "dspace:FINALIZED",
  TERMINATED = "dspace:TERMINATED",
}

export interface ContractNegotiationDto extends ContextDto, ReferenceDto {
  "@type": "dspace:ContractNegotiation";
  "dspace:consumerPid": string;
  "dspace:providerPid": string;
  "dspace:state": ContractNegotiationState;
}

export enum NegotiationEvent {
  ACCEPTED = "dspace:ACCEPTED",
  FINALIZED = "dspace:FINALIZED",
}

export interface ContractNegotiationEventMessageDto extends ContextDto {
  "@type": "dspace:ContractNegotiationEventMessage";
  "dspace:consumerPid": string;
  "dspace:providerPid": string;
  "dspace:eventType": NegotiationEvent;
}

export interface ContractNegotiationErrorDto extends ContextDto {
  "@type": "dspace:ContractNegotiationError";
  "dspace:consumerPid": string;
  "dspace:providerPid": string;
  "dspace:reason"?: Array<any>;
  "dct:description"?: Array<MultilanguageDto>;
}

export interface HashedMessage {
  "dspace:digest": string;
  "dspace:algorithm": string;
}

export interface ContractAgreementVerificationMessageDto extends ContextDto {
  "@type": "dspace:ContractAgreementVerificationMessage";
  "dspace:consumerPid": string;
  "dspace:providerPid": string;
  "dspace:hashedMessage": HashedMessage;
}

export interface ContractAgreementMessageDto extends ContextDto {
  "@type": "dspace:ContractAgreementMessage";
  "dspace:consumerPid": string;
  "dspace:providerPid": string;
  "dspace:agreement": AgreementDto;
}
