import { ContextDto } from "../common.dto.js";

export interface TransferProcessDto extends ContextDto {
  "@type": "TransferProcess";
  providerPid: string;
  consumerPid: string;
  state: TransferState;
}

export enum TransferState {
  REQUESTED = "REQUESTED",
  STARTED = "STARTED",
  TERMINATED = "TERMINATED",
  COMPLETED = "COMPLETED",
  SUSPENDED = "SUSPENDED"
}

export interface DataAddressDto extends ContextDto {
  "@type": "DataAddress";
  endpointType: string;
  endpoint: string;
  endpointProperties: Array<EndpointPropertyDto>;
}

export interface EndpointPropertyDto extends ContextDto {
  "@type": "EndpointProperty";
  name: string;
  value: string;
}

export interface TransferRequestMessageDto extends ContextDto {
  "@type": "TransferRequestMessage";
  consumerPid: string;
  agreementId: string;
  format: string;
  dataAddress?: DataAddressDto;
  callbackAddress: string;
}

export interface TransferStartMessageDto extends ContextDto {
  "@type": "TransferStartMessage";
  providerPid: string;
  consumerPid: string;
  dataAddress?: DataAddressDto;
}

export interface TransferSuspensionMessageDto extends ContextDto {
  "@type": "TransferSuspensionMessage";
  providerPid: string;
  consumerPid: string;
  reason: Array<any>;
}

export interface TransferCompletionMessageDto extends ContextDto {
  "@type": "TransferCompletionMessage";
  providerPid: string;
  consumerPid: string;
}

export interface TransferTerminationMessageDto extends ContextDto {
  "@type": "TransferTerminationMessage";
  providerPid: string;
  consumerPid: string;
  code: string;
  reason: Array<any>;
}

export interface TransferErrorDto extends ContextDto {
  "@type": "TransferError";
  providerPid: string;
  consumerPid: string;
  code: string;
  reason?: Array<any>;
}
