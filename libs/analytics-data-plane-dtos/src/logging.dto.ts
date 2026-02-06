import { IsOptional, IsString, Matches } from "class-validator";

export class LogFilterDto {
  @IsString()
  @IsOptional()
  remoteParty?: string;
  @IsString()
  @IsOptional()
  transferId?: string;
  @IsString()
  @IsOptional()
  datasetId?: string;
  @IsString()
  @Matches(/[0-9]([0-9]{2}|[xX]{2})/)
  @IsOptional()
  status?: string;
}

export interface LogEntry {
  id?: number;
  date: Date;
  remoteParty: string;
  transferId: string;
  datasetId: string;
  path: string;
  method: string;
  status: number;
  debug?: any;
}
