import {
  AgreementDto,
  ContractAgreementVerificationMessageDto,
  ContractNegotiationState,
  HashedMessage,
  MultilanguageDto,
  OfferDto
} from "@tsg-dsp/common-dsp";

export type NegotiationRole = "provider" | "consumer";

export interface NegotiationProcessEventDto {
  time: Date;
  state: ContractNegotiationState;
  localMessage?: string;
  code?: string;
  reason?: MultilanguageDto[];
  agreementMessage?: string;
  verification?: ContractAgreementVerificationMessageDto;
  hashedMessage?: HashedMessage;
  type: "local" | "remote";
}

export interface INegotiationStatusDto {
  localId: string;
  remoteId: string;
  remoteParty: string;
  role: NegotiationRole;
  remoteAddress: string;
  state: ContractNegotiationState;
  dataSet: string;
  modifiedDate: Date;
}

export interface NegotiationDetailDto extends INegotiationStatusDto {
  offer?: OfferDto;
  agreement?: AgreementDto;
  events: Array<NegotiationProcessEventDto>;
}
