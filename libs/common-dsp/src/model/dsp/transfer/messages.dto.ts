import { ContextDto, MultilanguageDto } from "../common.dto";

export interface TransferProcessDto extends ContextDto {
  "@type": "dspace:TransferProcess";
  "dspace:providerPid": string;
  "dspace:consumerPid": string;
  "dspace:agreementId": string;
  "dspace:state": TransferState;
}

export enum TransferState {
  REQUESTED = "dspace:REQUESTED",
  STARTED = "dspace:STARTED",
  TERMINATED = "dspace:TERMINATED",
  COMPLETED = "dspace:COMPLETED",
  SUSPENDED = "dspace:SUSPENDED"
}

export interface DataAddressDto extends ContextDto {
  "@type": "dspace:DataAddress";
  "dspace:endpointType": string;
  "dspace:endpoint": string;
  "dspace:endpointProperties": Array<EndpointPropertyDto>;
}

export interface EndpointPropertyDto extends ContextDto {
  "@type": "dspace:EndpointProperty";
  "dspace:name": string;
  "dspace:value": string;
}

export interface TransferRequestMessageDto extends ContextDto {
  "@type": "dspace:TransferRequestMessage";
  "dspace:consumerPid": string;
  "dspace:agreementId": string;
  "dct:format": string;
  "dspace:dataAddress"?: DataAddressDto;
  "dspace:callbackAddress": string;
}

export interface TransferStartMessageDto extends ContextDto {
  "@type": "dspace:TransferStartMessage";
  "dspace:providerPid": string;
  "dspace:consumerPid": string;
  "dspace:dataAddress"?: DataAddressDto;
}

export interface TransferSuspensionMessageDto extends ContextDto {
  "@type": "dspace:TransferSuspensionMessage";
  "dspace:providerPid": string;
  "dspace:consumerPid": string;
  "dspace:reason": Array<any>;
}

export interface TransferCompletionMessageDto extends ContextDto {
  "@type": "dspace:TransferCompletionMessage";
  "dspace:providerPid": string;
  "dspace:consumerPid": string;
}

export interface TransferTerminationMessageDto extends ContextDto {
  "@type": "dspace:TransferTerminationMessage";
  "dspace:providerPid": string;
  "dspace:consumerPid": string;
  "dspace:code": string;
  "dspace:reason": Array<any>;
}

export interface TransferErrorDto extends ContextDto {
  "@type": "dspace:TransferError";
  "dspace:providerPid": string;
  "dspace:consumerPid": string;
  "dspace:code": string;
  "dspace:reason"?: Array<any>;
}
