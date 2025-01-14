import { ApiProperty } from "@nestjs/swagger";
import {
  AgreementDto,
  AgreementSchema,
  DatasetDto,
  DatasetSchema
} from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class MetadataDto {
  @ApiProperty({ type: () => AgreementSchema })
  @Type(() => AgreementSchema)
  @ValidateNested()
  agreement!: AgreementDto;
  @ApiProperty({ type: () => DatasetSchema })
  @Type(() => DatasetSchema)
  @ValidateNested()
  dataset!: DatasetDto;
}
