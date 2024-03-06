import {
  ArrayNotEmpty,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Serializable, Namespace } from "../../decorators";
import { Multilanguage, SerializableClass } from "../common";
import {
  TransferCompletionMessageDto,
  TransferErrorDto,
  TransferProcessDto,
  TransferRequestMessageDto,
  TransferStartMessageDto,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto,
  TransferState,
  EndpointPropertyDto,
  DataAddressDto,
} from "@tsg-dsp/common";

export interface ITransferCompletionMessage {
  providerPid: string;
  consumerPid: string;
}

@Serializable("dspace:TransferCompletionMessage")
export class TransferCompletionMessage extends SerializableClass<TransferCompletionMessageDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  providerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  consumerPid: string;

  constructor(value: ITransferCompletionMessage) {
    super();
    this.providerPid = value.providerPid;
    this.consumerPid = value.consumerPid;
  }
}

export interface ITransferError {
  providerPid: string;
  consumerPid: string;
  code: string;
  reason?: Array<any>;
}

@Serializable("dspace:TransferError")
export class TransferError extends SerializableClass<TransferErrorDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  providerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  consumerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  code: string;
  @Namespace("dspace")
  @ValidateNested()
  @IsOptional()
  reason?: Array<Multilanguage>;

  constructor(value: ITransferError) {
    super();
    this.providerPid = value.providerPid;
    this.consumerPid = value.consumerPid;
    this.code = value.code;
    this.reason = value.reason;
  }
}

export interface ITransferProcess {
  providerPid: string;
  consumerPid: string;
  state: TransferState;
  agreementId: string;
}

@Serializable("dspace:TransferProcess")
export class TransferProcess extends SerializableClass<TransferProcessDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  providerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  consumerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  state: TransferState;
  @Namespace("dspace")
  @IsNotEmpty()
  agreementId: string;

  constructor(value: ITransferProcess) {
    super();
    this.providerPid = value.providerPid;
    this.consumerPid = value.consumerPid;
    this.state = value.state;
    this.agreementId = value.agreementId;
  }
}

@Serializable("dspace:EndpointProperty")
export class EndpointProperty extends SerializableClass<EndpointPropertyDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  name: string;
  @Namespace("dspace")
  @IsNotEmpty()
  value: string;
  constructor(value: IEndpointProperty) {
    super();
    this.name = value.name;
    this.value = value.value;
  }
}

export interface IDataAddress {
  endpointType: string;
  endpoint: string;
  endpointProperties: Array<EndpointProperty>;
}

@Serializable("dspace:DataAddress")
export class DataAddress extends SerializableClass<DataAddressDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  endpointType: string;
  @Namespace("dspace")
  @IsNotEmpty()
  endpoint: string;
  @Namespace("dspace")
  @IsNotEmpty()
  endpointProperties: Array<EndpointProperty>;

  constructor(value: IDataAddress) {
    super();
    this.endpointType = value.endpointType;
    this.endpoint = value.endpoint;
    this.endpointProperties = value.endpointProperties;
  }
}

export interface ITransferRequestMessage {
  consumerPid: string;
  agreementId: string;
  format: string;
  dataAddress?: DataAddress;
  callbackAddress: string;
}

@Serializable("dspace:TransferRequestMessage")
export class TransferRequestMessage extends SerializableClass<TransferRequestMessageDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  consumerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  agreementId: string;
  @Namespace("dct")
  @IsNotEmpty()
  format: string;
  @Namespace("dspace")
  @ValidateNested()
  dataAddress?: DataAddress;
  @Namespace("dspace")
  @IsNotEmpty()
  callbackAddress: string;

  constructor(value: ITransferRequestMessage) {
    super();
    this.consumerPid = value.consumerPid;
    this.agreementId = value.agreementId;
    this.format = value.format;
    this.dataAddress = value.dataAddress;
    this.callbackAddress = value.callbackAddress;
  }
}

// In discussion: https://github.com/International-Data-Spaces-Association/ids-specification/issues/107
export interface IEndpointProperty {
  name: string;
  value: string;
}

export interface ITransferStartMessage {
  providerPid: string;
  consumerPid: string;
  dataAddress?: DataAddress;
}

@Serializable("dspace:TransferStartMessage")
export class TransferStartMessage extends SerializableClass<TransferStartMessageDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  providerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  consumerPid: string;
  @Namespace("dspace")
  @ValidateNested()
  dataAddress?: DataAddress;

  constructor(value: ITransferStartMessage) {
    super();
    this.providerPid = value.providerPid;
    this.consumerPid = value.consumerPid;
    this.dataAddress = value.dataAddress;
  }
}

export interface ITransferSuspensionMessage {
  providerPid: string;
  consumerPid: string;
  reason: Array<any>;
}

@Serializable("dspace:TransferSuspensionMessage")
export class TransferSuspensionMessage extends SerializableClass<TransferSuspensionMessageDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  providerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  consumerPid: string;
  @Namespace("dspace")
  @ValidateNested()
  @ArrayNotEmpty()
  reason: Array<Multilanguage>;

  constructor(value: ITransferSuspensionMessage) {
    super();
    this.providerPid = value.providerPid;
    this.consumerPid = value.consumerPid;
    this.reason = value.reason;
  }
}

export interface ITransferTerminationMessage {
  providerPid: string;
  consumerPid: string;
  code: string;
  reason: Array<any>;
}

@Serializable("dspace:TransferTerminationMessage")
export class TransferTerminationMessage extends SerializableClass<TransferTerminationMessageDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  providerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  consumerPid: string;
  @Namespace("dspace")
  @IsNotEmpty()
  code: string;
  @Namespace("dspace")
  @IsNotEmpty()
  @ValidateNested()
  reason: Array<Multilanguage>;

  constructor(value: ITransferTerminationMessage) {
    super();
    this.providerPid = value.providerPid;
    this.consumerPid = value.consumerPid;
    this.code = value.code;
    this.reason = value.reason;
  }
}
