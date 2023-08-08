
export interface DataPlaneDetailsDto {
  identifier: string;
  dataplaneType: string;
  endpointPrefix: string;
  callbackAddress: string;
  managementAddress: string;
  managementToken: string;
  catalogSynchronization: "push" | "pull";
  role: "consumer" | "provider" | "both"
}

export type DataPlaneCreation = Omit<DataPlaneDetailsDto, "identifier"> & { identifier?: string }

export interface DataPlaneRequestResponseDto {
  accepted: boolean;
  identifier: string;
  callbackAddress?: string;
}

export interface DataPlaneTransferDto extends DataPlaneRequestResponseDto{
  dataPlaneIdentifier: string;
}