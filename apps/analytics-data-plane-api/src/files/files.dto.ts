import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString
} from "class-validator";

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
  @ApiProperty({ example: "file.csv" })
  @IsString()
  fileName!: string;
  @ApiProperty({ example: true })
  @IsBoolean()
  presentInLastCheck!: boolean;
  @ApiProperty({ type: () => CSVW })
  @IsOptional()
  csvw?: CSVW;
}
