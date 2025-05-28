import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
  DataAddressDto,
  EndpointPropertyDto,
  TransferCompletionMessageDto,
  TransferProcessDto,
  TransferRequestMessageDto,
  TransferStartMessageDto,
  TransferState,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto
} from "./messages.dto.js";

export class EndpointPropertySchema implements EndpointPropertyDto {
  @ApiProperty({ example: "EndpointProperty" })
  "@type": "EndpointProperty";
  @ApiProperty({ example: "endpointName" })
  "name": string;
  @ApiProperty({ example: "endpointValue" })
  "value": string;
}

export class DataAddressSchema implements DataAddressDto {
  @ApiProperty({ example: "DataAddress" })
  "@type": "DataAddress";
  @ApiProperty({ example: "http" })
  "endpointType": string;
  @ApiProperty({ example: "https://api.example.com" })
  "endpoint": string;
  @ApiPropertyOptional({
    type: [EndpointPropertySchema],
    example: [
      {
        "@type": "EndpointProperty",
        name: "endpointName",
        value: "endpointValue"
      }
    ]
  })
  "endpointProperties"?: Array<EndpointPropertyDto>;
}

export class TransferRequestMessageSchema implements TransferRequestMessageDto {
  @ApiProperty({ example: "TransferRequestMessage" })
  "@type": "TransferRequestMessage";
  @ApiProperty({ example: "consumer-pid-123" })
  "consumerPid": string;
  @ApiProperty({ example: "agreement-id-456" })
  "agreementId": string;
  @ApiProperty({ example: "application/json" })
  "format": string;
  @ApiPropertyOptional({
    type: DataAddressSchema,
    example: {
      "@type": "DataAddress",
      endpointType: "http",
      endpoint: "https://api.example.com",
      endpointProperties: [
        {
          "@type": "EndpointProperty",
          name: "name",
          value: "value"
        }
      ]
    }
  })
  "dataAddress"?: DataAddressDto;
  @ApiProperty({ example: "https://callback.example.com" })
  "callbackAddress": string;
}

export class TransferProcessSchema implements TransferProcessDto {
  @ApiProperty({ example: "TransferProcess" })
  "@type": "TransferProcess";
  @ApiProperty({ example: "provider-pid-789" })
  "providerPid": string;
  @ApiProperty({ example: "consumer-pid-123" })
  "consumerPid": string;
  @ApiProperty({ example: "agreement-id-456" })
  "agreementId": string;
  @ApiProperty({ example: "COMPLETED" })
  "state": TransferState;
}

export class TransferStartMessageSchema implements TransferStartMessageDto {
  @ApiProperty({ example: "TransferStartMessage" })
  "@type": "TransferStartMessage";
  @ApiProperty({ example: "provider-pid-789" })
  "providerPid": string;
  @ApiProperty({ example: "consumer-pid-123" })
  "consumerPid": string;
  @ApiPropertyOptional({
    type: DataAddressSchema,
    example: {
      "@type": "DataAddress",
      endpointType: "http",
      endpoint: "https://api.example.com",
      endpointProperties: [
        {
          "@type": "EndpointProperty",
          name: "name",
          value: "value"
        }
      ]
    }
  })
  "dataAddress"?: DataAddressDto;
}

export class TransferCompletionMessageSchema
  implements TransferCompletionMessageDto
{
  @ApiProperty({ example: "TransferCompletionMessage" })
  "@type": "TransferCompletionMessage";
  @ApiProperty({ example: "provider-pid-789" })
  "providerPid": string;
  @ApiProperty({ example: "consumer-pid-123" })
  "consumerPid": string;
}

export class TransferSuspensionMessageSchema
  implements TransferSuspensionMessageDto
{
  @ApiProperty({ example: "TransferSuspensionMessage" })
  "@type": "TransferSuspensionMessage";
  @ApiProperty({ example: "provider-pid-789" })
  "providerPid": string;
  @ApiProperty({ example: "consumer-pid-123" })
  "consumerPid": string;
  @ApiPropertyOptional({ example: ["Technical issue"] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  "reason"?: Array<any>;
}

export class TransferTerminationMessageSchema
  implements TransferTerminationMessageDto
{
  @ApiProperty({ example: "TransferTerminationMessage" })
  "@type": "TransferTerminationMessage";
  @ApiProperty({ example: "provider-pid-789" })
  "providerPid": string;
  @ApiProperty({ example: "consumer-pid-123" })
  "consumerPid": string;
  @ApiProperty({ example: "TERMINATED" })
  "code": string;
  @ApiPropertyOptional({ example: ["Contract breach"] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  "reason"?: Array<any>;
}
