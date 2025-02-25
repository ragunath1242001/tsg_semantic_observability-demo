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
  @ApiProperty({ example: "local-12345" })
  localId!: string;

  @ApiPropertyOptional({ example: "remote-98765" })
  remoteId?: string;

  @ApiProperty({ example: "provider" })
  role!: TransferRole;

  @ApiProperty({ example: "http://example.com/" })
  remoteAddress!: string;

  @ApiProperty({ example: "party-identifier-001" })
  remoteParty!: string;

  @ApiProperty({ enum: TransferState, example: TransferState.REQUESTED })
  state!: TransferState;

  @ApiProperty({
    type: TransferProcessSchema,
    example: {
      // Adjust the following sample according to TransferProcessDto properties
      step: "upload",
      progress: 50
    }
  })
  process!: TransferProcessDto;

  @ApiProperty({ example: "agreement-45678" })
  agreementId!: string;

  @ApiPropertyOptional({ example: "application/json" })
  format?: string;

  @ApiProperty({ example: "2023-10-01T12:34:56Z" })
  modifiedDate!: Date;
}

export class TransferEventDto {
  @ApiProperty({ example: "2023-10-01T12:00:00Z" })
  time!: Date;

  @ApiProperty({ enum: TransferState, example: TransferState.COMPLETED })
  state!: TransferState;

  @ApiPropertyOptional({ example: "The transfer completed successfully." })
  localMessage?: string;

  @ApiPropertyOptional({ example: "ERR_NONE" })
  code?: string;

  @ApiPropertyOptional({
    type: MultilanguageSchema,
    example: [
      {
        language: "en",
        value: "Operation successful"
      }
    ]
  })
  reason?: MultilanguageDto[];

  @ApiProperty({ enum: ["local", "remote"], example: "local" })
  type!: "local" | "remote";
}

export class TransferDetailDto extends TransferStatusDto {
  @ApiPropertyOptional({
    type: DataAddressSchema,
    example: {
      // Adjust this sample to reflect the real structure of DataAddressDto
      type: "S3",
      bucketName: "example-bucket",
      region: "us-east-1"
    }
  })
  dataAddress?: DataAddressDto;

  @ApiProperty({
    type: DataPlaneTransferDto,
    example: {
      // Adjust this sample to reflect the real structure of DataPlaneTransferDto
      transportProtocol: "HTTP",
      endpoint: "https://data-plane.example.com/transfer"
    }
  })
  dataPlaneTransfer!: DataPlaneTransferDto;

  @ApiProperty({
    type: [TransferEventDto],
    example: [
      {
        time: "2023-10-01T12:00:00Z",
        state: TransferState.STARTED,
        localMessage: "Upload started.",
        code: "STARTED",
        reason: [
          {
            language: "en",
            value: "Transfer initiated"
          }
        ],
        type: "local"
      }
    ]
  })
  events!: TransferEventDto[];
}
