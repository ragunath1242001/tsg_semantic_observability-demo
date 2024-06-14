import {
  DataAddressDto,
  DataPlaneTransferDto,
  MultilanguageDto,
  TransferProcessDto,
  TransferState,
} from "@libs/common-dsp";

export type TransferRole = "provider" | "consumer";
export interface TransferStatus {
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

export interface TransferDetailDto extends TransferStatus {
  dataAddress?: DataAddressDto;
  dataPlaneTransfer: DataPlaneTransferDto;
  events: TransferEventDto[];
}
