import { ApiProperty } from "@nestjs/swagger";
import { DataPlaneDetailsDto } from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";

export class DataPlaneStateDto {
  @ApiProperty({ example: "44d1f3d6-f65d-4a7c-84db-f92ba826305e" })
  @IsString()
  identifier!: string;

  @ApiProperty({ type: () => DataPlaneDetailsDto })
  @ValidateNested()
  @Type(() => DataPlaneDetailsDto)
  details!: DataPlaneDetailsDto;
}
