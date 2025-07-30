import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsNumber, IsString } from "class-validator";

export class AlgorithmEventDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  eventId!: string;

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

  @ApiProperty()
  @IsString()
  createdBy!: string;

  @ApiProperty({ type: [String], required: false })
  @IsString({ each: true })
  transferIds?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsString({ each: true })
  recipients?: string[];
}
