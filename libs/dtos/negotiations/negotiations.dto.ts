import { AgreementDto, ContractAgreementVerificationMessageDto, ContractNegotiationState, MultilanguageDto, NegotiationEvent, OfferDto } from "@tsg-dsp/common";

export type NegotiationRole = "provider" | "consumer";

export interface NegotiationProcessEventDto {
    time: Date
    state: ContractNegotiationState
    localMessage?: string
    code?: string
    reason?: MultilanguageDto[]
    agreementMessage?: string
    verification?: ContractAgreementVerificationMessageDto
    type: "local" | "remote"
}

export interface NegotiationStatusDto {
    localId: string,
    remoteId: string,
    remoteParty: string,
    role: NegotiationRole,
    remoteAddress: string,
    state: ContractNegotiationState,
    dataSet: string,
    modifiedDate: Date
}

export interface NegotiationDetailDto extends NegotiationStatusDto {
    offer: OfferDto;
    agreement: AgreementDto;
    events: Array<NegotiationProcessEventDto>
}

