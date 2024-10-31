import { Dataset } from "../dsp/catalog/catalog";

export enum HealthStatus {
  HEALTHY,
  UNRESPONSIVE,
  ERRONEOUS,
  EXITED,
  UNKNOWN
}
export interface IDataPlaneStatus {
  identifier: string;
  created?: Date;
  modified?: Date;
  health: HealthStatus;
  missedHealthChecks: number;
  etag?: string;
}

export class DataPlaneStatus {
  identifier: string;
  created?: Date;
  modified?: Date;
  health: HealthStatus;
  missedHealthChecks: number;
  etag?: string;

  constructor(value: IDataPlaneStatus) {
    this.identifier = value.identifier;
    this.created = value.created;
    this.modified = value.modified;
    this.health = value.health;
    this.missedHealthChecks = value.missedHealthChecks;
    this.etag = value.etag;
  }
}

export interface IDataPlane extends IDataPlaneStatus {
  datasets?: Array<Dataset>;
  dataplaneType: string;
  endpointPrefix: string;
  callbackAddress: string;
  managementAddress: string;
  managementToken: string;
  catalogSynchronization: "push" | "pull";
  role: "consumer" | "provider" | "both";
}

export class DataPlane extends DataPlaneStatus {
  datasets?: Array<Dataset>;
  dataplaneType: string;
  endpointPrefix: string;
  callbackAddress: string;
  managementAddress: string;
  managementToken: string;
  catalogSynchronization: "push" | "pull";
  role: "consumer" | "provider" | "both";

  constructor(value: IDataPlane) {
    super(value);
    this.datasets = value.datasets;
    this.dataplaneType = value.dataplaneType;
    this.endpointPrefix = value.endpointPrefix;
    this.callbackAddress = value.callbackAddress;
    this.managementAddress = value.managementAddress;
    this.managementToken = value.managementToken;
    this.catalogSynchronization = value.catalogSynchronization;
    this.role = value.role;
  }
}
