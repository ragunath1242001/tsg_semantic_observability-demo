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
  @ApiProperty({ example: "odrl:Offer" })
  declare "@type": "odrl:Offer";

  @ApiProperty({ example: "did:example:assigner" })
  declare "odrl:assigner": string;
}

export class AgreementSchema extends PolicySchema implements AgreementDto {
  @ApiProperty({ example: "odrl:Agreement" })
  declare "@type": "odrl:Agreement";

  @ApiProperty({ example: "did:example:assigner" })
  declare "odrl:assigner": string;

  @ApiProperty({ example: "did:example:assignee" })
  declare "odrl:assignee": string;

  @ApiProperty({ example: "2023-10-01T12:34:56Z" })
  "dspace:timestamp": string;

  @ApiProperty({ example: "urn:example:target" })
  declare "odrl:target": string;
}

export class HashedMessageSchema implements HashedMessage {
  @ApiProperty({ example: "sha256:abcdef1234567890" })
  "dspace:digest": string;

  @ApiProperty({ example: "SHA-256" })
  "dspace:algorithm": string;
}

export class ContractAgreementVerificationMessageSchema
  implements ContractAgreementVerificationMessageDto
{
  @ApiProperty({ example: "dspace:ContractAgreementVerificationMessage" })
  "@type": "dspace:ContractAgreementVerificationMessage";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "dspace:consumerPid": string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "dspace:providerPid": string;

  @ApiProperty({
    type: HashedMessageSchema,
    example: {
      "dspace:digest": "sha256:abcdef1234567890",
      "dspace:algorithm": "SHA-256"
    }
  })
  "dspace:hashedMessage": HashedMessageSchema;
}

export class ContractRequestMessageSchema implements ContractRequestMessageDto {
  @ApiProperty({ example: "dspace:ContractRequestMessage" })
  "@type": "dspace:ContractRequestMessage";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "dspace:consumerPid": string;

  @ApiPropertyOptional({ example: "urn:example:providerPid" })
  "dspace:providerPid"?: string;

  @ApiProperty({ example: "http://example.com/callback" })
  "dspace:callbackAddress": string;

  @ApiProperty({
    type: OfferSchema,
    example: {
      "@type": "odrl:Offer",
      "odrl:assigner": "urn:example:assigner"
    }
  })
  "dspace:offer": OfferDto;
}

export class ContractNegotiationSchema
  extends ReferenceSchema
  implements ContractNegotiationDto
{
  @ApiProperty({ example: "dspace:ContractNegotiation" })
  "@type": "dspace:ContractNegotiation";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "dspace:consumerPid"!: string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "dspace:providerPid"!: string;

  @ApiProperty({ example: "REQUESTED" })
  "dspace:state"!: ContractNegotiationState;
}

export class ContractNegotiationEventMessageSchema
  implements ContractNegotiationEventMessageDto
{
  @ApiProperty({ example: "dspace:ContractNegotiationEventMessage" })
  "@type": "dspace:ContractNegotiationEventMessage";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "dspace:consumerPid": string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "dspace:providerPid": string;

  @ApiProperty({ example: "NEGOTIATION_STARTED" })
  "dspace:eventType": NegotiationEvent;
}

export class ContractOfferMessageSchema implements ContractOfferMessageDto {
  @ApiProperty({ example: "dspace:ContractOfferMessage" })
  "@type": "dspace:ContractOfferMessage";

  @ApiPropertyOptional({ example: "urn:example:consumerPid" })
  "dspace:consumerPid"?: string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "dspace:providerPid"!: string;

  @ApiProperty({
    type: OfferSchema,
    example: {
      "@type": "odrl:Offer",
      "odrl:assigner": "urn:example:assigner"
    }
  })
  "dspace:offer"!: OfferDto;

  @ApiProperty({ example: "http://example.com/offer-callback" })
  "dspace:callbackAddress"!: string;
}

export class ContractAgreementMessageSchema
  implements ContractAgreementMessageDto
{
  @ApiProperty({ example: "dspace:ContractAgreementMessage" })
  "@type": "dspace:ContractAgreementMessage";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "dspace:consumerPid"!: string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "dspace:providerPid"!: string;

  @ApiProperty({
    type: AgreementSchema,
    example: {
      "@type": "odrl:Agreement",
      "odrl:assigner": "urn:example:assigner",
      "odrl:assignee": "urn:example:assignee",
      "dspace:timestamp": "2023-10-01T12:34:56Z",
      "odrl:target": "urn:example:target"
    }
  })
  "dspace:agreement"!: AgreementDto;
}

export class ContractNegotiationTerminationMessageSchema
  implements ContractNegotiationTerminationMessageDto
{
  @ApiProperty({ example: "dspace:ContractNegotiationTerminationMessage" })
  "@type": "dspace:ContractNegotiationTerminationMessage";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "dspace:consumerPid": string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "dspace:providerPid": string;

  @ApiPropertyOptional({ example: "USER_CANCELLED" })
  "dspace:code"?: string;

  @ApiProperty({
    type: [MultilanguageSchema],
    example: [
      { language: "en", text: "User cancelled negotiation." },
      { language: "nl", text: "Gebruiker heeft de onderhandeling geannuleerd." }
    ]
  })
  "dspace:reason": Array<MultilanguageDto>;
}
