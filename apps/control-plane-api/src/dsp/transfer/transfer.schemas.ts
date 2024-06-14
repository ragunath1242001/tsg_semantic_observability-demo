import {
  TransferState,
  TransferProcessDto,
  TransferRequestMessageDto,
  DataAddressDto,
  EndpointPropertyDto,
  TransferStartMessageDto,
  TransferCompletionMessageDto,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto,
  DataPlaneTransferDto,
  TransferEvent,
  DataPlaneRequestResponseDto,
  MultilanguageDto,
  DataPlaneAddressDto,
} from "@libs/common-dsp";
import { TransferEventDto } from "@libs/common-dsp/dist/model/dsp/transfer/transfers.dto";
import { TransferRole, TransferStatus } from "@libs/control-plane-dtos";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MultilanguageSchema } from "../common.schema";

export class EndpointPropertySchema implements EndpointPropertyDto {
  @ApiProperty()
  "@type": "dspace:EndpointProperty";
  @ApiProperty()
  "dspace:name": string;
  @ApiProperty()
  "dspace:value": string;
}

export class DataAddressSchema implements DataAddressDto {
  @ApiProperty()
  "@type": "dspace:DataAddress";
  @ApiProperty()
  "dspace:endpointType": string;
  @ApiProperty()
  "dspace:endpoint": string;
  @ApiProperty({ type: [EndpointPropertySchema] })
  "dspace:endpointProperties": Array<EndpointPropertyDto>;
}

export class TransferRequestMessageSchema implements TransferRequestMessageDto {
  @ApiProperty()
  "@type": "dspace:TransferRequestMessage";
  @ApiProperty()
  "dspace:consumerPid": string;
  @ApiProperty()
  "dspace:agreementId": string;
  @ApiProperty()
  "dct:format": string;
  @ApiPropertyOptional({ type: DataAddressSchema })
  "dspace:dataAddress"?: DataAddressDto;
  @ApiProperty()
  "dspace:callbackAddress": string;
}

export class TransferProcessSchema implements TransferProcessDto {
  @ApiProperty()
  "@type": "dspace:TransferProcess";
  @ApiProperty()
  "dspace:providerPid": string;
  @ApiProperty()
  "dspace:consumerPid": string;
  @ApiProperty()
  "dspace:agreementId": string;
  @ApiProperty()
  "dspace:state": TransferState;
}

export class TransferStatusDto implements TransferStatus {
  @ApiProperty()
  localId!: string;
  @ApiPropertyOptional()
  remoteId?: string;
  @ApiProperty()
  role!: TransferRole;
  @ApiProperty()
  remoteAddress!: string;
  @ApiProperty()
  remoteParty!: string;
  @ApiProperty()
  state!: TransferState;
  @ApiProperty({ type: TransferProcessSchema })
  process!: TransferProcessDto;
  @ApiProperty()
  agreementId!: string;
  @ApiPropertyOptional()
  format?: string;
  @ApiProperty()
  modifiedDate!: Date;
}

export class DataPlaneAddressSchema implements DataPlaneAddressDto {
  @ApiProperty()
  endpoint!: string;
  @ApiProperty()
  properties!: { name: string; value: string }[];
}

export class DataPlaneRequestResponseSchema
  implements DataPlaneRequestResponseDto
{
  @ApiProperty()
  accepted!: boolean;
  @ApiProperty()
  identifier!: string;
  @ApiPropertyOptional({ type: DataAddressSchema })
  dataAddress?: DataPlaneAddressDto;
  @ApiPropertyOptional()
  callbackAddress?: string;
}

export class TransferEventSchema implements TransferEventDto {
  @ApiProperty()
  time!: Date;
  @ApiProperty()
  state!: TransferState;
  @ApiProperty()
  localMessage?: string;
  @ApiProperty()
  code?: string;
  @ApiPropertyOptional({ type: MultilanguageSchema })
  reason?: MultilanguageDto[];
  @ApiProperty()
  type!: "local" | "remote";
}

export class DataPlaneTransferSchema
  extends DataPlaneRequestResponseSchema
  implements DataPlaneTransferDto
{
  @ApiProperty()
  dataPlaneIdentifier!: string;
  @ApiProperty()
  endpointType!: string;
}

export class TransferDetailSchema extends TransferStatusDto {
  @ApiProperty({ type: DataAddressSchema })
  dataAddress?: DataAddressDto;
  @ApiProperty({ type: DataPlaneTransferSchema })
  dataPlaneTransfer!: DataPlaneTransferDto;
  @ApiProperty({ type: TransferEventSchema })
  events!: TransferEvent[];
}

export class TransferStartMessageSchema implements TransferStartMessageDto {
  @ApiProperty()
  "@type": "dspace:TransferStartMessage";
  @ApiProperty()
  "dspace:providerPid": string;
  @ApiProperty()
  "dspace:consumerPid": string;
  @ApiPropertyOptional({ type: DataAddressSchema })
  "dspace:dataAddress"?: DataAddressDto;
}

export class TransferCompletionMessageSchema
  implements TransferCompletionMessageDto
{
  @ApiProperty()
  "@type": "dspace:TransferCompletionMessage";
  @ApiProperty()
  "dspace:providerPid": string;
  @ApiProperty()
  "dspace:consumerPid": string;
}

export class TransferSuspensionMessageSchema
  implements TransferSuspensionMessageDto
{
  @ApiProperty()
  "@type": "dspace:TransferSuspensionMessage";
  @ApiProperty()
  "dspace:providerPid": string;
  @ApiProperty()
  "dspace:consumerPid": string;
  @ApiProperty()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  "dspace:reason": Array<any>;
}

export class TransferTerminationMessageSchema
  implements TransferTerminationMessageDto
{
  @ApiProperty()
  "@type": "dspace:TransferTerminationMessage";
  @ApiProperty()
  "dspace:providerPid": string;
  @ApiProperty()
  "dspace:consumerPid": string;
  @ApiProperty()
  "dspace:code": string;
  @ApiProperty()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  "dspace:reason": Array<any>;
}
export { DataPlaneAddressDto };
