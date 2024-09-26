import { DataPlaneDetailsDto, DatasetDto } from "@tsg-dsp/common-dsp";

export interface DataPlaneStateDto {
  identifier: string;
  details: DataPlaneDetailsDto;
  dataset: Array<DatasetDto>;
}
