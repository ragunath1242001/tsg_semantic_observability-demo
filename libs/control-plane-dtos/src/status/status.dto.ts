import { ApiProperty } from "@nestjs/swagger";
import {
  ContractNegotiationState,
  NegotiationRole,
  TransferRole,
  TransferState
} from "@tsg-dsp/common-dsp";

export class MemoryUsageDto {
  @ApiProperty({ example: 1024 })
  does_zap_garbage!: number;
  @ApiProperty({ example: 2048 })
  external_memory!: number;
  @ApiProperty({ example: 4096 })
  heap_size_limit!: number;
  @ApiProperty({ example: 512 })
  malloced_memory!: number;
  @ApiProperty({ example: 0 })
  number_of_detached_contexts!: number;
  @ApiProperty({ example: 2 })
  number_of_native_contexts!: number;
  @ApiProperty({ example: 1024 })
  peak_malloced_memory!: number;
  @ApiProperty({ example: 8192 })
  total_available_size!: number;
  @ApiProperty({ example: 256 })
  total_global_handles_size!: number;
  @ApiProperty({ example: 16384 })
  total_heap_size!: number;
  @ApiProperty({ example: 4096 })
  total_heap_size_executable!: number;
  @ApiProperty({ example: 32768 })
  total_physical_size!: number;
  @ApiProperty({ example: 128 })
  used_global_handles_size!: number;
  @ApiProperty({ example: 8192 })
  used_heap_size!: number;
}

export class StatusNegotiationDto {
  @ApiProperty({ example: "provider" })
  role!: NegotiationRole;
  @ApiProperty({ example: "OFFERED" })
  state!: ContractNegotiationState;
  @ApiProperty({ example: 1 })
  count!: number;
}

export class StatusTransferDto {
  @ApiProperty({ example: "provider" })
  role!: TransferRole;
  @ApiProperty({ example: TransferState.COMPLETED })
  state!: TransferState;
  @ApiProperty({ example: 3 })
  count!: number;
}

export class DatabaseStatusDto {
  @ApiProperty({ example: "connected" })
  status!: string;
}

export class StatusDto {
  @ApiProperty({
    type: () => DatabaseStatusDto,
    example: { status: "connected" }
  })
  database!: DatabaseStatusDto;
  @ApiProperty({
    type: () => MemoryUsageDto,
    example: {
      does_zap_garbage: 1024,
      external_memory: 2048,
      heap_size_limit: 4096,
      malloced_memory: 512,
      number_of_detached_contexts: 0,
      number_of_native_contexts: 2,
      peak_malloced_memory: 1024,
      total_available_size: 8192,
      total_global_handles_size: 256,
      total_heap_size: 16384,
      total_heap_size_executable: 4096,
      total_physical_size: 32768,
      used_global_handles_size: 128,
      used_heap_size: 8192
    }
  })
  memoryUsage!: MemoryUsageDto;
  @ApiProperty({ example: 3600 })
  uptime!: number;
  @ApiProperty({ type: () => StatusNegotiationDto })
  negotiations!: StatusNegotiationDto[];
  @ApiProperty({ type: () => StatusTransferDto })
  transfers!: StatusTransferDto[];
}
