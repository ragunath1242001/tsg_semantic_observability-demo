import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsObject, IsOptional, IsString } from "class-validator";

export class CreateInternalEventDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  number!: number;

  @ApiProperty()
  @IsString()
  timestamp!: string;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true
  })
  @IsOptional()
  @IsObject()
  data?: object;
}
