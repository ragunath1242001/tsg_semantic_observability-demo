import { ApiProperty } from "@nestjs/swagger";
import {
  NegotiationRole,
  ContractNegotiationState,
  TransferRole,
  TransferState
} from "@tsg-dsp/common-dsp";

export class MemoryUsageDto {
  @ApiProperty()
  does_zap_garbage!: number;
  @ApiProperty()
  external_memory!: number;
  @ApiProperty()
  heap_size_limit!: number;
  @ApiProperty()
  malloced_memory!: number;
  @ApiProperty()
  number_of_detached_contexts!: number;
  @ApiProperty()
  number_of_native_contexts!: number;
  @ApiProperty()
  peak_malloced_memory!: number;
  @ApiProperty()
  total_available_size!: number;
  @ApiProperty()
  total_global_handles_size!: number;
  @ApiProperty()
  total_heap_size!: number;
  @ApiProperty()
  total_heap_size_executable!: number;
  @ApiProperty()
  total_physical_size!: number;
  @ApiProperty()
  used_global_handles_size!: number;
  @ApiProperty()
  used_heap_size!: number;
}

export class NegotiationStatusDto {
  @ApiProperty()
  role!: NegotiationRole;
  @ApiProperty()
  state!: ContractNegotiationState;
  @ApiProperty()
  count!: number;
}

export class TransferStatusDto {
  @ApiProperty()
  role!: TransferRole;
  @ApiProperty()
  state!: TransferState;
  @ApiProperty()
  count!: number;
}

export class DatabaseStatusDto {
  @ApiProperty()
  status!: string;
}

export class StatusDto {
  @ApiProperty({ type: () => DatabaseStatusDto })
  database!: DatabaseStatusDto;
  @ApiProperty({ type: () => MemoryUsageDto })
  memoryUsage!: MemoryUsageDto;
  @ApiProperty()
  uptime!: number;
  @ApiProperty({ type: () => NegotiationStatusDto })
  negotiations!: NegotiationStatusDto[];
  @ApiProperty({ type: () => TransferStatusDto })
  transfers!: TransferStatusDto[];
}
