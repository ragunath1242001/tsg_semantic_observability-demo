import {
  DataAddressDto,
  DataPlaneRequestResponseDto,
  TransferRequestMessageDto,
  TransferState,
} from "@tsg-dsp/common";

export interface TransferDto {
  id: string;
  role: "provider" | "consumer";
  processId: string;
  remoteParty: string;
  secret?: string;
  state: TransferState;
  request: TransferRequestMessageDto;
  response: DataPlaneRequestResponseDto;
  dataAddress?: DataAddressDto;
  createdDate: Date;
  modifiedDate: Date;
  deletedDate: Date;
}
