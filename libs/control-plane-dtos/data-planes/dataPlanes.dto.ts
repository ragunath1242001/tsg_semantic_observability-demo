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

export interface DataPlaneAddress {
  endpoint: string;
  properties: { name: string; value: string }[];
}

export interface DataPlaneRequestResponseDto {
  accepted: boolean;
  identifier: string;
  dataAddress?: DataPlaneAddress;
  callbackAddress?: string;
}

export interface DataPlaneTransferDto extends DataPlaneRequestResponseDto {
  dataPlaneIdentifier: string;
  endpointType: string;
}
