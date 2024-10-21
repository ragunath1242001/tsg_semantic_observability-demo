import {
  AgreementDto,
  ContractAgreementMessageDto,
  ContractAgreementVerificationMessage,
  ContractAgreementVerificationMessageDto,
  ContractNegotiationDto,
  ContractNegotiationEventMessageDto,
  ContractNegotiationState,
  ContractNegotiationTerminationMessageDto,
  ContractOfferMessageDto,
  ContractRequestMessageDto,
  HashedMessage,
  Multilanguage,
  MultilanguageDto,
  NegotiationEvent,
  NegotiationProcessEvent,
  NegotiationRole,
  OfferDto,
} from "@tsg-dsp/common-dsp";
import {
  INegotiationStatusDto,
  NegotiationProcessEventDto,
} from "@tsg-dsp/control-plane-dtos";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MultilanguageSchema, ReferenceSchema } from "./common.schema";
import { PolicySchema } from "./catalog.schema";

export class OfferSchema extends PolicySchema implements OfferDto {
  @ApiProperty()
  declare "@type": "odrl:Offer";
  @ApiProperty()
  declare "odrl:assigner": string;
}

export class AgreementSchema extends PolicySchema implements AgreementDto {
  @ApiProperty()
  declare "@type": "odrl:Agreement";
  @ApiProperty()
  declare "odrl:assigner": string;
  @ApiProperty()
  declare "odrl:assignee": string;
  @ApiProperty()
  "dspace:timestamp": string;
  @ApiProperty()
  declare "odrl:target": string;
}

export class ContractAgreementVerificationMessageSchema
  implements ContractAgreementVerificationMessageDto
{
  @ApiProperty()
  "@type": "dspace:ContractAgreementVerificationMessage";
  @ApiProperty()
  "dspace:consumerPid": string;
  @ApiProperty()
  "dspace:providerPid": string;
  @ApiProperty()
  "dspace:hashedMessage": HashedMessage;
}

export class NegotiationStatusDto implements INegotiationStatusDto {
  @ApiProperty()
  localId!: string;
  @ApiProperty()
  remoteId!: string;
  @ApiProperty()
  remoteParty!: string;
  @ApiProperty()
  role!: NegotiationRole;
  @ApiProperty()
  remoteAddress!: string;
  @ApiProperty()
  state!: ContractNegotiationState;
  @ApiProperty()
  dataSet!: string;
  @ApiProperty()
  modifiedDate!: Date;
}

export class NegotiationProcessEventSchema extends NegotiationProcessEvent {
  @ApiProperty()
  declare time: Date;
  @ApiProperty()
  declare state: ContractNegotiationState;
  @ApiPropertyOptional()
  declare localMessage?: string;
  @ApiPropertyOptional()
  declare code?: string;
  @ApiPropertyOptional({ type: [MultilanguageSchema] })
  declare reason?: Multilanguage[];
  @ApiPropertyOptional()
  declare agreementMessage?: string;
  @ApiPropertyOptional({ type: ContractAgreementVerificationMessageSchema })
  declare verification?: ContractAgreementVerificationMessage;
  @ApiProperty()
  declare type: "local" | "remote";
}

export class NegotiationDetailSchema extends NegotiationStatusDto {
  @ApiProperty({ type: OfferSchema })
  offer!: OfferDto;
  @ApiProperty({ type: AgreementSchema })
  agreement!: AgreementDto;
  @ApiProperty({ type: [NegotiationProcessEventSchema] })
  events!: Array<NegotiationProcessEventDto>;
}

export class ContractRequestMessageSchema implements ContractRequestMessageDto {
  @ApiProperty()
  "@type": "dspace:ContractRequestMessage";
  @ApiProperty()
  "dspace:consumerPid": string;
  @ApiPropertyOptional()
  "dspace:providerPid"?: string;
  @ApiProperty()
  "dspace:callbackAddress": string;
  @ApiProperty({ type: OfferSchema })
  "dspace:offer": OfferDto;
}

export class ContractNegotiationSchema
  extends ReferenceSchema
  implements ContractNegotiationDto
{
  @ApiProperty()
  "@type": "dspace:ContractNegotiation";
  @ApiProperty()
  "dspace:consumerPid"!: string;
  @ApiProperty()
  "dspace:providerPid"!: string;
  @ApiProperty()
  "dspace:state"!: ContractNegotiationState;
}

export class ContractNegotiationEventMessageSchema
  implements ContractNegotiationEventMessageDto
{
  @ApiProperty()
  "@type": "dspace:ContractNegotiationEventMessage";
  @ApiProperty()
  "dspace:consumerPid": string;
  @ApiProperty()
  "dspace:providerPid": string;
  @ApiProperty()
  "dspace:eventType": NegotiationEvent;
}

export class ContractOfferMessageSchema implements ContractOfferMessageDto {
  @ApiProperty()
  "@type": "dspace:ContractOfferMessage";
  @ApiPropertyOptional()
  "dspace:consumerPid"?: string;
  @ApiProperty()
  "dspace:providerPid"!: string;
  @ApiProperty({ type: OfferSchema })
  "dspace:offer"!: OfferDto;
  @ApiProperty()
  "dspace:callbackAddress"!: string;
}

export class ContractAgreementMessageSchema
  implements ContractAgreementMessageDto
{
  @ApiProperty()
  "@type": "dspace:ContractAgreementMessage";
  @ApiProperty()
  "dspace:consumerPid"!: string;
  @ApiProperty()
  "dspace:providerPid"!: string;
  @ApiProperty({ type: AgreementSchema })
  "dspace:agreement"!: AgreementDto;
}

export class ContractNegotiationTerminationMessageSchema
  implements ContractNegotiationTerminationMessageDto
{
  @ApiProperty()
  "@type": "dspace:ContractNegotiationTerminationMessage";
  @ApiProperty()
  "dspace:consumerPid": string;
  @ApiProperty()
  "dspace:providerPid": string;
  @ApiPropertyOptional()
  "dspace:code"?: string;
  @ApiProperty({ type: [MultilanguageSchema] })
  "dspace:reason": Array<MultilanguageDto>;
}
