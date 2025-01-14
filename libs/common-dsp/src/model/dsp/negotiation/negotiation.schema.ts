import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MultilanguageSchema, ReferenceSchema } from "../common.schema.js";
import { PolicySchema } from "../catalog/catalog.schema.js";
import { MultilanguageDto } from "../common.dto.js";
import {
  HashedMessage,
  ContractAgreementVerificationMessageDto,
  ContractNegotiationState,
  ContractRequestMessageDto,
  ContractNegotiationDto,
  ContractNegotiationEventMessageDto,
  NegotiationEvent,
  ContractOfferMessageDto,
  ContractAgreementMessageDto,
  ContractNegotiationTerminationMessageDto
} from "./messages.dto.js";
import { OfferDto, AgreementDto } from "./negotiation.dto.js";

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

export class HashedMessageSchema implements HashedMessage {
  @ApiProperty()
  "dspace:digest": string;
  @ApiProperty()
  "dspace:algorithm": string;
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
  @ApiProperty({ type: HashedMessageSchema })
  "dspace:hashedMessage": HashedMessageSchema;
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
