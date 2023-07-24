import { ContextDto, MultilanguageDto, URIDto } from "../common.dto";


export interface TransferCompletionMessageDto extends ContextDto {
  '@type': 'dspace:TransferCompletionMessage'
  'dspace:processId': string;
}

export interface TransferErrorDto extends ContextDto {
  '@type': 'dspace:TransferError'
  'dspace:processId': string;
  'dspace:code': string;
  'dspace:reason'?: Array<MultilanguageDto | string>;
}

export enum TransferState {
  REQUESTED = "dspace:REQUESTED",
  STARTED = "dspace:STARTED",
  TERMINATED = "dspace:TERMINATED",
  COMPLETED = "dspace:COMPLETED",
  SUSPENDED = "dspace:SUSPENDED",
}

export interface TransferProcessDto extends ContextDto {
  '@type': 'dspace:TransferProcess'
  'dspace:processId': string;
  'dspace:transferState': TransferState;
}

export interface TransferRequestMessageDto extends ContextDto {
  '@type': 'dspace:TransferRequestMessage'
  'dspace:agreementId': string;
  'dct:format': string;
  'dspace:dataAddress'?: URIDto;
  'dspace:callbackAddress'?: string;
}

export interface TransferStartMessageDto extends ContextDto {
  '@type': 'dspace:TransferStartMessage'
  'dspace:processId': string;
  'dspace:dataAddress'?: URIDto;
}

export interface TransferSuspensionMessageDto extends ContextDto {
  '@type': 'dspace:TransferSuspensionMessage'
  'dspace:processId': string;
  'dspace:reason': Array<MultilanguageDto | string>;
}

export interface TransferTerminationMessageDto extends ContextDto {
  '@type': 'dspace:TransferTerminationMessage'
  'dspace:processId': string;
  'dspace:code': string;
  'dspace:reason': Array<MultilanguageDto | string>;
}