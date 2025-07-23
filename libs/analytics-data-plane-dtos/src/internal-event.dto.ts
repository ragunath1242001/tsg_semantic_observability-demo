import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDate, IsNumber, IsOptional, IsString } from "class-validator";

export class InternalEventDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  algorithmInstanceId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  number!: number;

  @ApiProperty()
  @IsDate()
  timestamp!: Date;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  data?: object;
}
