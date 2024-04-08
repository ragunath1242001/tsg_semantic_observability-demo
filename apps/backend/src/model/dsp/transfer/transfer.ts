import { DataPlaneTransferDto } from "@libs/dtos";
import { TransferState } from "@tsg-dsp/common";
import { Multilanguage } from "../common";
import { TransferProcess, DataAddress } from "./messages";
import { TransferRole } from "@libs/dtos";
import {
  createInstance,
  createInstances,
  createOptionalInstances,
} from "../../../utils/instances";

export interface ITransferEvent {
  time: Date;
  state: TransferState;
  localMessage?: string;
  code?: string;
  reason?: Multilanguage[];
  type: "local" | "remote";
}

export class TransferEvent {
  time: Date;
  state: TransferState;
  localMessage?: string;
  code?: string;
  reason?: Multilanguage[];
  type: "local" | "remote";

  constructor(value: ITransferEvent) {
    this.time = value.time;
    this.state = value.state;
    this.localMessage = value.localMessage;
    this.code = value.code;
    this.reason = createOptionalInstances(value.reason, Multilanguage);
    this.type = value.type;
  }
}

export interface ITransferStatus {
  localId: string;
  remoteId?: string;
  role: TransferRole;
  remoteAddress: string;
  remoteParty: string;
  state: TransferState;
  process: TransferProcess;
  agreementId: string;
  format?: string;
}

export class TransferStatus {
  localId: string;
  remoteId?: string;
  role: TransferRole;
  remoteAddress: string;
  remoteParty: string;
  state: TransferState;
  process: TransferProcess;
  agreementId: string;
  format?: string;

  constructor(value: ITransferStatus) {
    this.localId = value.localId;
    this.remoteId = value.remoteId;
    this.role = value.role;
    this.remoteAddress = value.remoteAddress;
    this.remoteParty = value.remoteParty;
    this.state = value.state;
    this.process = createInstance(value.process, TransferProcess);
    this.agreementId = value.agreementId;
    this.format = value.format;
  }
}

export interface ITransferDetail extends ITransferStatus {
  dataAddress?: DataAddress;
  dataPlaneTransfer: DataPlaneTransferDto;
  events: TransferEvent[];
}

export class TransferDetail extends TransferStatus {
  dataAddress?: DataAddress;
  dataPlaneTransfer: DataPlaneTransferDto;
  events: TransferEvent[];

  constructor(value: ITransferDetail) {
    super(value);
    this.dataAddress = value.dataAddress;
    this.dataPlaneTransfer = value.dataPlaneTransfer;
    this.events = createInstances(value.events, TransferEvent);
  }
}
