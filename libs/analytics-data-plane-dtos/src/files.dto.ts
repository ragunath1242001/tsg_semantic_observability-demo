import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString
} from "class-validator";

export enum MetadataStatus {
  PENDING = "pending",
  GENERATING = "generating",
  COMPLETE = "complete",
  ERROR = "error"
}

export class CSVWTableSchema {
  @ApiPropertyOptional({
    example: [{ name: "http://example.com/tableSchema.json" }]
  })
  @IsArray()
  @IsOptional()
  columns?: { name: string }[];
}

export class CSVWTable {
  @ApiProperty({ example: "http://example.com/table.csv" })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ type: () => CSVWTableSchema })
  @IsOptional()
  tableSchema?: CSVWTableSchema;

  @ApiPropertyOptional({ example: { header: true } })
  @IsObject()
  @IsOptional()
  dialect?: {
    header: boolean;
  };
}

export class CSVW {
  @IsArray()
  @ApiProperty({ example: ["http://example.com/csvw.json"] })
  "@context": string[];

  @ApiPropertyOptional({ type: () => CSVWTable })
  @IsOptional()
  @IsArray()
  tables?: CSVWTable[];
}

export class FileMetadataDto {
  @ApiProperty({ example: "45f38abb-e7d7-4cf1-ac19-ac447466b8f5" })
  @IsString()
  identifier!: string;
  @ApiProperty({ example: 1000 })
  @IsNumber()
  fileSizeInBytes!: number;
  @ApiProperty({ example: "1744033172435-file.csv" })
  @IsString()
  fileName!: string;
  @ApiProperty({ example: "file.csv" })
  @IsString()
  originalFileName!: string;
  @ApiProperty({ example: "text/csv" })
  @IsString()
  mediaType!: string;
  @ApiProperty({ example: true })
  @IsBoolean()
  presentInLastCheck!: boolean;
  @ApiProperty({ type: () => CSVW })
  @IsOptional()
  csvw?: CSVW;
  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  inlineCsvw?: boolean;
  @ApiPropertyOptional({ example: "dataset-123" })
  @IsString()
  @IsOptional()
  datasetId?: string;

  @ApiProperty({
    enum: MetadataStatus,
    example: MetadataStatus.COMPLETE,
    description: "Status of metadata generation for this file"
  })
  @IsEnum(MetadataStatus)
  metadataStatus!: MetadataStatus;

  @ApiPropertyOptional({
    example: "Failed to generate LLM metadata: API rate limit exceeded",
    description: "Error message if metadata generation failed"
  })
  @IsString()
  @IsOptional()
  metadataError?: string;
}

export class FileUpdateDto {
  @ApiProperty({ example: "file.csv" })
  @IsString()
  @IsOptional()
  originalFileName?: string;

  @ApiProperty({ example: "text/csv" })
  @IsString()
  @IsOptional()
  mediaType?: string;

  @ApiProperty({ type: () => CSVW })
  @IsOptional()
  csvw?: CSVW;
}
