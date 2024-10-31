import { DataPlaneTransferDto } from "../../data-planes";
import { MultilanguageDto } from "../common.dto";
import {
  TransferState,
  TransferProcessDto,
  DataAddressDto
} from "./messages.dto";

export type TransferRole = "provider" | "consumer";

export interface TransferStatusDto {
  localId: string;
  remoteId?: string;
  role: TransferRole;
  remoteAddress: string;
  remoteParty: string;
  state: TransferState;
  process: TransferProcessDto;
  agreementId: string;
  format?: string;
  modifiedDate: Date;
}

export interface TransferEventDto {
  time: Date;
  state: TransferState;
  localMessage?: string;
  code?: string;
  reason?: MultilanguageDto[];
  type: "local" | "remote";
}

export interface TransferDetailDto extends TransferStatusDto {
  dataAddress?: DataAddressDto;
  dataPlaneTransfer: DataPlaneTransferDto;
  events: TransferEventDto[];
}
