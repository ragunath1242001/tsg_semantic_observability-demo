import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MultilanguageDto } from "../common.dto.js";
import {
  TransferState,
  TransferProcessDto,
  DataAddressDto
} from "./messages.dto.js";
import { DataAddressSchema, TransferProcessSchema } from "./transfer.schema.js";
import { MultilanguageSchema } from "../common.schema.js";
import { DataPlaneTransferDto } from "../../data-planes/index.js";

export type TransferRole = "provider" | "consumer";

export class TransferStatusDto {
  @ApiProperty()
  localId!: string;
  @ApiPropertyOptional()
  remoteId?: string;
  @ApiProperty()
  role!: TransferRole;
  @ApiProperty()
  remoteAddress!: string;
  @ApiProperty()
  remoteParty!: string;
  @ApiProperty({ enum: TransferState })
  state!: TransferState;
  @ApiProperty({ type: TransferProcessSchema })
  process!: TransferProcessDto;
  @ApiProperty()
  agreementId!: string;
  @ApiPropertyOptional()
  format?: string;
  @ApiProperty()
  modifiedDate!: Date;
}

export class TransferEventDto {
  @ApiProperty()
  time!: Date;
  @ApiProperty({ enum: TransferState })
  state!: TransferState;
  @ApiPropertyOptional()
  localMessage?: string;
  @ApiPropertyOptional()
  code?: string;
  @ApiPropertyOptional({ type: MultilanguageSchema })
  reason?: MultilanguageDto[];
  @ApiProperty({ enum: ["local", "remote"] })
  type!: "local" | "remote";
}

export class TransferDetailDto extends TransferStatusDto {
  @ApiPropertyOptional({ type: DataAddressSchema })
  dataAddress?: DataAddressDto;
  @ApiProperty({ type: DataPlaneTransferDto })
  dataPlaneTransfer!: DataPlaneTransferDto;
  @ApiProperty({ type: [TransferEventDto] })
  events!: TransferEventDto[];
}
