import { DatasetDto } from "@tsg-dsp/common-dsp";

export interface IDataPlaneDto {
  datasets?: DatasetDto[];
  identifier: string;
  dataplaneType: string;
  endpointPrefix: string;
  callbackAddress: string;
  managementAddress: string;
  managementToken: string;
  catalogSynchronization: "push" | "pull";
  role: "consumer" | "provider" | "both";
}

export type DataPlaneCreation = Omit<IDataPlaneDto, "identifier"> & {
  identifier?: string;
};
