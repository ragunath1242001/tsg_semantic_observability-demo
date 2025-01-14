import {
  DataPlaneDetailsDto,
  DatasetDto,
  DatasetSchema
} from "@tsg-dsp/common-dsp";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, ValidateNested, IsArray } from "class-validator";

export class DataPlaneStateDto {
  @ApiProperty()
  @IsString()
  identifier!: string;

  @ApiProperty({ type: () => DataPlaneDetailsDto })
  @ValidateNested()
  @Type(() => DataPlaneDetailsDto)
  details!: DataPlaneDetailsDto;

  @ApiProperty({ type: () => [DatasetSchema] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DatasetSchema)
  dataset!: Array<DatasetDto>;
}
