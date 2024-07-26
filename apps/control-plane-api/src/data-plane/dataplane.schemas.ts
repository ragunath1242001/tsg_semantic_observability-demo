import { DatasetDto } from "@tsg-dsp/common-dsp";
import { IDataPlaneDto } from "@tsg-dsp/control-plane-dtos";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class BaseDataPlaneDto {
  @ApiPropertyOptional()
  datasets?: DatasetDto[];

  @ApiProperty()
  dataplaneType!: string;

  @ApiProperty()
  endpointPrefix!: string;

  @ApiProperty()
  callbackAddress!: string;

  @ApiProperty()
  managementAddress!: string;

  @ApiProperty()
  managementToken!: string;

  @ApiProperty()
  catalogSynchronization!: "push" | "pull";

  @ApiProperty()
  role!: "consumer" | "provider" | "both";
}

export class DataPlaneDto extends BaseDataPlaneDto implements IDataPlaneDto {
  @ApiProperty()
  identifier!: string;
}

export class DataPlaneCreationDto extends BaseDataPlaneDto {
  @ApiPropertyOptional()
  identifier?: string;
}
