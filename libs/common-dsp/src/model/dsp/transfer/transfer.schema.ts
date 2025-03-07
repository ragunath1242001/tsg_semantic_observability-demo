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
  @ApiProperty({ example: "dspace:EndpointProperty" })
  "@type": "dspace:EndpointProperty";
  @ApiProperty({ example: "endpointName" })
  "dspace:name": string;
  @ApiProperty({ example: "endpointValue" })
  "dspace:value": string;
}

export class DataAddressSchema implements DataAddressDto {
  @ApiProperty({ example: "dspace:DataAddress" })
  "@type": "dspace:DataAddress";
  @ApiProperty({ example: "http" })
  "dspace:endpointType": string;
  @ApiProperty({ example: "https://api.example.com" })
  "dspace:endpoint": string;
  @ApiProperty({
    type: [EndpointPropertySchema],
    example: [
      {
        "@type": "dspace:EndpointProperty",
        "dspace:name": "endpointName",
        "dspace:value": "endpointValue"
      }
    ]
  })
  "dspace:endpointProperties": Array<EndpointPropertyDto>;
}

export class TransferRequestMessageSchema implements TransferRequestMessageDto {
  @ApiProperty({ example: "dspace:TransferRequestMessage" })
  "@type": "dspace:TransferRequestMessage";
  @ApiProperty({ example: "consumer-pid-123" })
  "dspace:consumerPid": string;
  @ApiProperty({ example: "agreement-id-456" })
  "dspace:agreementId": string;
  @ApiProperty({ example: "application/json" })
  "dct:format": string;
  @ApiPropertyOptional({
    type: DataAddressSchema,
    example: {
      "@type": "dspace:DataAddress",
      "dspace:endpointType": "http",
      "dspace:endpoint": "https://api.example.com",
      "dspace:endpointProperties": [
        {
          "@type": "dspace:EndpointProperty",
          "dspace:name": "name",
          "dspace:value": "value"
        }
      ]
    }
  })
  "dspace:dataAddress"?: DataAddressDto;
  @ApiProperty({ example: "https://callback.example.com" })
  "dspace:callbackAddress": string;
}

export class TransferProcessSchema implements TransferProcessDto {
  @ApiProperty({ example: "dspace:TransferProcess" })
  "@type": "dspace:TransferProcess";
  @ApiProperty({ example: "provider-pid-789" })
  "dspace:providerPid": string;
  @ApiProperty({ example: "consumer-pid-123" })
  "dspace:consumerPid": string;
  @ApiProperty({ example: "agreement-id-456" })
  "dspace:agreementId": string;
  @ApiProperty({ example: "COMPLETED" })
  "dspace:state": TransferState;
}

export class TransferStartMessageSchema implements TransferStartMessageDto {
  @ApiProperty({ example: "dspace:TransferStartMessage" })
  "@type": "dspace:TransferStartMessage";
  @ApiProperty({ example: "provider-pid-789" })
  "dspace:providerPid": string;
  @ApiProperty({ example: "consumer-pid-123" })
  "dspace:consumerPid": string;
  @ApiPropertyOptional({
    type: DataAddressSchema,
    example: {
      "@type": "dspace:DataAddress",
      "dspace:endpointType": "http",
      "dspace:endpoint": "https://api.example.com",
      "dspace:endpointProperties": [
        {
          "@type": "dspace:EndpointProperty",
          "dspace:name": "name",
          "dspace:value": "value"
        }
      ]
    }
  })
  "dspace:dataAddress"?: DataAddressDto;
}

export class TransferCompletionMessageSchema
  implements TransferCompletionMessageDto
{
  @ApiProperty({ example: "dspace:TransferCompletionMessage" })
  "@type": "dspace:TransferCompletionMessage";
  @ApiProperty({ example: "provider-pid-789" })
  "dspace:providerPid": string;
  @ApiProperty({ example: "consumer-pid-123" })
  "dspace:consumerPid": string;
}

export class TransferSuspensionMessageSchema
  implements TransferSuspensionMessageDto
{
  @ApiProperty({ example: "dspace:TransferSuspensionMessage" })
  "@type": "dspace:TransferSuspensionMessage";
  @ApiProperty({ example: "provider-pid-789" })
  "dspace:providerPid": string;
  @ApiProperty({ example: "consumer-pid-123" })
  "dspace:consumerPid": string;
  @ApiProperty({ example: ["Technical issue"] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  "dspace:reason": Array<any>;
}

export class TransferTerminationMessageSchema
  implements TransferTerminationMessageDto
{
  @ApiProperty({ example: "dspace:TransferTerminationMessage" })
  "@type": "dspace:TransferTerminationMessage";
  @ApiProperty({ example: "provider-pid-789" })
  "dspace:providerPid": string;
  @ApiProperty({ example: "consumer-pid-123" })
  "dspace:consumerPid": string;
  @ApiProperty({ example: "TERMINATED" })
  "dspace:code": string;
  @ApiProperty({ example: ["Contract breach"] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  "dspace:reason": Array<any>;
}
