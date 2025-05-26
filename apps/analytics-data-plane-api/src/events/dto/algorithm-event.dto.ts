import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class AlgorithmEventDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  analysisId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  number!: number;

  @ApiProperty()
  @IsString()
  timestamp!: string;

  @ApiPropertyOptional({ type: "string", format: "binary" })
  @IsOptional()
  data?: Buffer;

  @ApiProperty()
  @IsString()
  createdBy!: string;
}
