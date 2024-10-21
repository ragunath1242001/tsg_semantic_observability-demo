import {
  DataAddressDto,
  DataPlaneTransferDto,
  MultilanguageDto,
  TransferEventDto,
  TransferProcessDto,
  TransferState,
} from "@tsg-dsp/common-dsp";

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

export interface TransferDetailDto extends TransferStatus {
  dataAddress?: DataAddressDto;
  dataPlaneTransfer: DataPlaneTransferDto;
  events: TransferEventDto[];
}
