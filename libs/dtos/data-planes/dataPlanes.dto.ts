import { DatasetDto } from "@tsg-dsp/common";

export interface DataPlaneDto {
  dataset?: DatasetDto;
  identifier: string;
  dataplaneType: string;
  endpointPrefix: string;
  callbackAddress: string;
  managementAddress: string;
  managementToken: string;
  catalogSynchronization: "push" | "pull";
  role: "consumer" | "provider" | "both"
}

export type DataPlaneCreation = Omit<DataPlaneDto, "identifier"> & { identifier?: string }

export interface DataPlaneAddressDto {
  endpoint: string,
  properties: { name: string, value: string }[]
}

export interface DataPlaneRequestResponseDto {
  accepted: boolean;
  identifier: string;
  dataAddress?: DataPlaneAddressDto,
  callbackAddress?: string;
}

export interface DataPlaneTransferDto extends DataPlaneRequestResponseDto {
  dataPlaneIdentifier: string;
  endpointType: string;
}