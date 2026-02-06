import {
  createInstances,
  createOptionalInstances
} from "../../../utils/instances.js";
import { DataPlaneTransferDto } from "../../data-planes/index.js";
import { Multilanguage } from "../common.js";
import { TransferState } from "./messages.dto.js";
import { DataAddress } from "./messages.js";
import { TransferRole } from "./transfers.dto.js";

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
  id: string;
  remoteId?: string;
  role: TransferRole;
  remoteAddress: string;
  remoteParty: string;
  state: TransferState;
  agreementId: string;
  format?: string;
  modifiedDate: Date;
}

export class TransferStatus {
  id: string;
  remoteId?: string;
  role: TransferRole;
  remoteAddress: string;
  remoteParty: string;
  state: TransferState;
  agreementId: string;
  format?: string;
  modifiedDate: Date;

  constructor(value: ITransferStatus) {
    this.id = value.id;
    this.remoteId = value.remoteId;
    this.role = value.role;
    this.remoteAddress = value.remoteAddress;
    this.remoteParty = value.remoteParty;
    this.state = value.state;
    this.agreementId = value.agreementId;
    this.format = value.format;
    this.modifiedDate = value.modifiedDate;
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
