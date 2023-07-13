import { LDContext, LDMultilanguage, LDURI } from "../common.schema";


export interface LDTransferCompletionMessage extends LDContext {
  '@type': 'dspace:TransferCompletionMessage'
  'dspace:processId': string;
}

export interface LDTransferError extends LDContext {
  '@type': 'dspace:TransferError'
  'dspace:processId': string;
  'dspace:code': string;
  'dspace:reason'?: Array<LDMultilanguage | string>;
}

export enum TransferState {
  REQUESTED = "dspace:REQUESTED",
  STARTED = "dspace:STARTED",
  TERMINATED = "dspace:TERMINATED",
  COMPLETED = "dspace:COMPLETED",
  SUSPENDED = "dspace:SUSPENDED",
}

export interface LDTransferProcess extends LDContext {
  '@type': 'dspace:TransferProcess'
  'dspace:processId': string;
  'dspace:transferState': TransferState;
}

export interface LDTransferRequestMessage extends LDContext {
  '@type': 'dspace:TransferRequestMessage'
  'dspace:agreementId': string;
  'dct:format': string;
  'dspace:dataAddress'?: LDURI;
  'dspace:callbackAddress'?: string;
}

export interface LDTransferStartMessage extends LDContext {
  '@type': 'dspace:TransferStartMessage'
  'dspace:processId': string;
  'dspace:dataAddress'?: LDURI;
}

export interface LDTransferSuspensionMessage extends LDContext {
  '@type': 'dspace:TransferSuspensionMessage'
  'dspace:processId': string;
  'dspace:reason': Array<LDMultilanguage | string>;
}

export interface LDTransferTerminationMessage extends LDContext {
  '@type': 'dspace:TransferTerminationMessage'
  'dspace:processId': string;
  'dspace:code': string;
  'dspace:reason': Array<LDMultilanguage | string>;
}