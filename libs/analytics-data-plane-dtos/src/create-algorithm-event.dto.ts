import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateAlgorithmEventDto {
  @ApiProperty()
  @IsString()
  eventId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  number!: number;

  /** @deprecated timestamps of algorithm events are generated server-side */
  @ApiProperty()
  @IsString()
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional({
    type: [String],
    description: "List of participant IDs to forward this event to"
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];
}
