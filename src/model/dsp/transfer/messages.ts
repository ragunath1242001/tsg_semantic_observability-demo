import { ArrayNotEmpty, IsNotEmpty, ValidateNested } from "class-validator";
import { Serializable, Namespace } from "../../decorators";
import { Multilanguage, SerializableClass, URI } from "../common";
import { LDTransferCompletionMessage, LDTransferError, LDTransferProcess, LDTransferRequestMessage, LDTransferStartMessage, LDTransferSuspensionMessage, LDTransferTerminationMessage, TransferState } from "./messages.schema";

export interface ITransferCompletionMessage {
  processId: string;
}

@Serializable("dspace:TransferCompletionMessage")
export class TransferCompletionMessage extends SerializableClass<LDTransferCompletionMessage> {
  @Namespace("dspace")
  @IsNotEmpty()
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
export class TransferError extends SerializableClass<LDTransferError> {
  @Namespace("dspace")
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  @IsNotEmpty()
  code: string;
  @Namespace("dspace")
  @ValidateNested()
  reason?: Array<Multilanguage>;

  constructor(value: ITransferError) {
    super()
    this.processId = value.processId;
    this.code = value.code;
    this.reason = value.reason;
  }
}

export interface ITransferProcess {
  processId: string;
  transferState: TransferState;
}

@Serializable("dspace:TransferProcess")
export class TransferProcess extends SerializableClass<LDTransferProcess> {
  @Namespace("dspace")
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  @IsNotEmpty()
  transferState: TransferState;

  constructor(value: ITransferProcess) {
    super()
    this.processId = value.processId;
    this.transferState = value.transferState;
  }
}

export interface ITransferRequestMessage {
  agreementId: string;
  format: string;
  dataAddress?: URI;
  callbackAddress?: string;
}

@Serializable("dspace:TransferRequestMessage")
export class TransferRequestMessage extends SerializableClass<LDTransferRequestMessage> {
  @Namespace("dspace")
  @IsNotEmpty()
  agreementId: string;
  @Namespace("dct")
  @IsNotEmpty()
  format: string;
  @Namespace("dspace")
  @ValidateNested()
  dataAddress?: URI;
  @Namespace("dspace")
  @ValidateNested()
  callbackAddress?: string;

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
export class TransferStartMessage extends SerializableClass<LDTransferStartMessage> {
  @Namespace("dspace")
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  @ValidateNested()
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
export class TransferSuspensionMessage extends SerializableClass<LDTransferSuspensionMessage> {
  @Namespace("dspace")
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  @ValidateNested()
  @ArrayNotEmpty()
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
export class TransferTerminationMessage extends SerializableClass<LDTransferTerminationMessage> {
  @Namespace("dspace")
  @IsNotEmpty()
  processId: string;
  @Namespace("dspace")
  @IsNotEmpty()
  code: string;
  @Namespace("dspace")
  @IsNotEmpty()
  @ValidateNested()
  reason: Array<Multilanguage>;

  constructor(value: ITransferTerminationMessage) {
    super()
    this.processId = value.processId;
    this.code = value.code;
    this.reason = value.reason;
  }
}
