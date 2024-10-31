import { ApiProperty } from "@nestjs/swagger";
import { DataPlaneDetailsDto, TransferState } from "@tsg-dsp/common-dsp";
import {
  AgreementSchema,
  DataAddressSchema,
  DataPlaneRequestResponseSchema,
  DataPlaneStateDto,
  DatasetSchema,
  TransferDto,
  TransferRequestMessageSchema
} from "@tsg-dsp/common-dtos";

export class DataPlaneDetailsSchema implements DataPlaneDetailsDto {
  @ApiProperty()
  identifier!: string;
  @ApiProperty()
  dataplaneType!: string;
  @ApiProperty()
  endpointPrefix!: string;
  @ApiProperty()
  callbackAddress!: string;
  @ApiProperty()
  managementAddress!: string;
  @ApiProperty()
  managementToken!: string;
  @ApiProperty()
  catalogSynchronization!: "push" | "pull";
  @ApiProperty()
  role!: "consumer" | "provider" | "both";
}

export class DataPlaneStateSchema implements DataPlaneStateDto {
  @ApiProperty()
  identifier!: string;
  @ApiProperty()
  details!: DataPlaneDetailsSchema;
  @ApiProperty()
  dataset!: Array<DatasetSchema>;
}

export class TransferSchema implements TransferDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  role!: "provider" | "consumer";
  @ApiProperty()
  processId!: string;
  @ApiProperty()
  remoteParty!: string;
  @ApiProperty()
  secret?: string;
  @ApiProperty()
  state!: TransferState;
  @ApiProperty()
  request!: TransferRequestMessageSchema;
  @ApiProperty()
  response!: DataPlaneRequestResponseSchema;
  @ApiProperty()
  dataAddress?: DataAddressSchema;
  @ApiProperty()
  createdDate!: Date;
  @ApiProperty()
  modifiedDate!: Date;
  @ApiProperty()
  deletedDate!: Date;
}

export class MetadataSchema {
  @ApiProperty()
  agreement!: AgreementSchema;
  @ApiProperty()
  dataset!: DatasetSchema;
}
