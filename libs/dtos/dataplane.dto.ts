import { DataPlaneDetailsDto, DatasetDto } from "@tsg-dsp/common";

export interface DataPlaneStateDto {
  identifier: string;
  details: DataPlaneDetailsDto;
  dataset: Array<DatasetDto>;
}
