import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { PolicySchema } from "../catalog/catalog.schema.js";
import { MultilanguageDto } from "../common.dto.js";
import { MultilanguageSchema, ReferenceSchema } from "../common.schema.js";
import {
  ContractAgreementMessageDto,
  ContractAgreementVerificationMessageDto,
  ContractNegotiationDto,
  ContractNegotiationEventMessageDto,
  ContractNegotiationState,
  ContractNegotiationTerminationMessageDto,
  ContractOfferMessageDto,
  ContractRequestMessageDto,
  HashedMessage,
  NegotiationEvent
} from "./messages.dto.js";
import { AgreementDto, OfferDto } from "./negotiation.dto.js";

export class OfferSchema extends PolicySchema implements OfferDto {
  @ApiProperty({ example: "Offer" })
  declare "@type": "Offer";

  @ApiProperty({ example: "did:example:assigner" })
  declare "assigner": string;
}

export class AgreementSchema extends PolicySchema implements AgreementDto {
  @ApiProperty({ example: "Agreement" })
  declare "@type": "Agreement";

  @ApiProperty({ example: "did:example:assigner" })
  declare "assigner": string;

  @ApiProperty({ example: "did:example:assignee" })
  declare "assignee": string;

  @ApiProperty({ example: "2023-10-01T12:34:56Z" })
  "timestamp": string;

  @ApiProperty({ example: "urn:example:target" })
  declare "target": string;
}

export class HashedMessageSchema implements HashedMessage {
  @ApiProperty({ example: "sha256:abcdef1234567890" })
  "digest": string;

  @ApiProperty({ example: "SHA-256" })
  "algorithm": string;
}

export class ContractAgreementVerificationMessageSchema
  implements ContractAgreementVerificationMessageDto
{
  @ApiProperty({ example: "ContractAgreementVerificationMessage" })
  "@type": "ContractAgreementVerificationMessage";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "consumerPid": string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "providerPid": string;

  @ApiProperty({
    type: HashedMessageSchema,
    example: {
      digest: "sha256:abcdef1234567890",
      algorithm: "SHA-256"
    }
  })
  "hashedMessage": HashedMessageSchema;
}

export class ContractRequestMessageSchema implements ContractRequestMessageDto {
  @ApiProperty({ example: "ContractRequestMessage" })
  "@type": "ContractRequestMessage";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "consumerPid": string;

  @ApiPropertyOptional({ example: "urn:example:providerPid" })
  "providerPid"?: string;

  @ApiProperty({ example: "http://example.com/callback" })
  "callbackAddress": string;

  @ApiProperty({
    type: OfferSchema,
    example: {
      "@type": "Offer",
      assigner: "urn:example:assigner"
    }
  })
  "offer": OfferDto;
}

export class ContractNegotiationSchema
  extends ReferenceSchema
  implements ContractNegotiationDto
{
  @ApiProperty({ example: "ContractNegotiation" })
  "@type": "ContractNegotiation";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "consumerPid"!: string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "providerPid"!: string;

  @ApiProperty({ example: "REQUESTED" })
  "state"!: ContractNegotiationState;
}

export class ContractNegotiationEventMessageSchema
  implements ContractNegotiationEventMessageDto
{
  @ApiProperty({ example: "ContractNegotiationEventMessage" })
  "@type": "ContractNegotiationEventMessage";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "consumerPid": string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "providerPid": string;

  @ApiProperty({ example: "NEGOTIATION_STARTED" })
  "eventType": NegotiationEvent;
}

export class ContractOfferMessageSchema implements ContractOfferMessageDto {
  @ApiProperty({ example: "ContractOfferMessage" })
  "@type": "ContractOfferMessage";

  @ApiPropertyOptional({ example: "urn:example:consumerPid" })
  "consumerPid"?: string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "providerPid"!: string;

  @ApiProperty({
    type: OfferSchema,
    example: {
      "@type": "Offer",
      assigner: "urn:example:assigner"
    }
  })
  "offer"!: OfferDto;

  @ApiProperty({ example: "http://example.com/offer-callback" })
  "callbackAddress"!: string;
}

export class ContractAgreementMessageSchema
  implements ContractAgreementMessageDto
{
  @ApiProperty({ example: "ContractAgreementMessage" })
  "@type": "ContractAgreementMessage";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "consumerPid"!: string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "providerPid"!: string;

  @ApiProperty({
    type: AgreementSchema,
    example: {
      "@type": "Agreement",
      assigner: "urn:example:assigner",
      assignee: "urn:example:assignee",
      timestamp: "2023-10-01T12:34:56Z",
      target: "urn:example:target"
    }
  })
  "agreement"!: AgreementDto;
}

export class ContractNegotiationTerminationMessageSchema
  implements ContractNegotiationTerminationMessageDto
{
  @ApiProperty({ example: "ContractNegotiationTerminationMessage" })
  "@type": "ContractNegotiationTerminationMessage";

  @ApiProperty({ example: "urn:example:consumerPid" })
  "consumerPid": string;

  @ApiProperty({ example: "urn:example:providerPid" })
  "providerPid": string;

  @ApiPropertyOptional({ example: "USER_CANCELLED" })
  "code"?: string;

  @ApiProperty({
    type: [MultilanguageSchema],
    example: [
      { language: "en", text: "User cancelled negotiation." },
      { language: "nl", text: "Gebruiker heeft de onderhandeling geannuleerd." }
    ]
  })
  "reason": Array<MultilanguageDto>;
}
