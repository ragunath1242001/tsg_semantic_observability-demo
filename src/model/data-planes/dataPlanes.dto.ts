
export interface DataPlaneDetailsDto {
  identifier: string;
  dataplaneType: string;
  endpointPrefix: string;
  callbackAddress: string;
  catalogSynchronization: "push" | "pull";
  role: "consumer" | "provider" | "both"
}

export type DataPlaneCreation = Omit<DataPlaneDetailsDto, "identifier"> & { identifier?: string }