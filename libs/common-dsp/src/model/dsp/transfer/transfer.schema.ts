import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  EndpointPropertyDto,
  DataAddressDto,
  TransferRequestMessageDto,
  TransferProcessDto,
  TransferState,
  TransferStartMessageDto,
  TransferCompletionMessageDto,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto
} from "./messages.dto.js";

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
