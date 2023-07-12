import { Serializable, Namespace } from "../../decorators";
import { Multilanguage, SerializableClass, URI } from "../common";

export interface ITransferCompletionMessage {
  processId: string;
}

@Serializable("dspace:TransferCompletionMessage")
export class TransferCompletionMessage extends SerializableClass {
  @Namespace("dspace")
  processId: string;

  constructor(value: ITransferCompletionMessage) {
    super()
    this.processId = value.processId;
  }
}

export interface ITransferError {
  processId: string;
  code: string;
  reason?: Array<Multilanguage>;
}

@Serializable("dspace:TransferError")
export class TransferError extends SerializableClass {
  @Namespace("dspace")
  processId: string;
  @Namespace("dspace")
  code: string;
  @Namespace("dspace")
  reason?: Array<Multilanguage>;

  constructor(value: ITransferError) {
    super()
    this.processId = value.processId;
    this.code = value.code;
    this.reason = value.reason;
  }
}

export enum TransferState {
  REQUESTED = "dspace:REQUESTED",
  STARTED = "dspace:STARTED",
  TERMINATED = "dspace:TERMINATED",
  COMPLETED = "dspace:COMPLETED",
  SUSPENDED = "dspace:SUSPENDED",
}

export interface ITransferProcess {
  processId: string;
  transferState: TransferState;
}

@Serializable("dspace:TransferProcess")
export class TransferProcess extends SerializableClass {
  @Namespace("dspace")
  processId: string;
  @Namespace("dspace")
  transferState: TransferState;

  constructor(value: ITransferProcess) {
    super()
    this.processId = value.processId;
    this.transferState = value.transferState;
  }
}

export interface ITransferRequestMessage {
  agreementId: URI;
  format: string;
  dataAddress?: URI;
  callbackAddress?: URI;
}

@Serializable("dspace:TransferRequestMessage")
export class TransferRequestMessage extends SerializableClass {
  @Namespace("dspace")
  agreementId: URI;
  @Namespace("dct")
  format: string;
  @Namespace("dspace")
  dataAddress?: URI;
  @Namespace("dspace")
  callbackAddress?: URI;

  constructor(value: ITransferRequestMessage) {
    super()
    this.agreementId = value.agreementId;
    this.format = value.format;
    this.dataAddress = value.dataAddress;
    this.callbackAddress = value.callbackAddress;
  }
}

export interface ITransferStartMessage {
  processId: string;
  dataAddress?: URI;
}

@Serializable("dspace:TransferStartMessage")
export class TransferStartMessage extends SerializableClass {
  @Namespace("dspace")
  processId: string;
  @Namespace("dspace")
  dataAddress?: URI;

  constructor(value: ITransferStartMessage) {
    super()
    this.processId = value.processId;
    this.dataAddress = value.dataAddress;
  }
}

export interface ITransferSuspensionMessage {
  processId: string;
  reason: Array<Multilanguage>;
}

@Serializable("dspace:TransferSuspensionMessage")
export class TransferSuspensionMessage extends SerializableClass {
  @Namespace("dspace")
  processId: string;
  @Namespace("dspace")
  reason: Array<Multilanguage>;

  constructor(value: ITransferSuspensionMessage) {
    super()
    this.processId = value.processId;
    this.reason = value.reason;
  }
}

export interface ITransferTerminationMessage {
  processId: string;
  code: string;
  reason: Array<Multilanguage>;
}

@Serializable("dspace:TransferTerminationMessage")
export class TransferTerminationMessage extends SerializableClass {
  @Namespace("dspace")
  processId: string;
  @Namespace("dspace")
  code: string;
  @Namespace("dspace")
  reason: Array<Multilanguage>;

  constructor(value: ITransferTerminationMessage) {
    super()
    this.processId = value.processId;
    this.code = value.code;
    this.reason = value.reason;
  }
}
