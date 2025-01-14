import { ApiProperty } from "@nestjs/swagger";

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

export class IssuanceStatusDto {
  @ApiProperty()
  issued!: number;
  @ApiProperty()
  open!: number;
}

export class CredentialStatusDto {
  @ApiProperty()
  selfSigned!: number;
  @ApiProperty()
  thirdParty!: number;
}

export class DatabaseStatusDto {
  @ApiProperty()
  status!: string;
}

export class StatusDto {
  @ApiProperty({ type: () => DatabaseStatusDto })
  database!: DatabaseStatusDto;
  @ApiProperty()
  uptime!: number;
  @ApiProperty({ type: () => MemoryUsageDto })
  memoryUsage!: MemoryUsageDto;
  @ApiProperty({ type: () => IssuanceStatusDto })
  issuance!: IssuanceStatusDto;
  @ApiProperty({ type: () => CredentialStatusDto })
  credentials!: CredentialStatusDto;
  @ApiProperty()
  keys!: number;
}
