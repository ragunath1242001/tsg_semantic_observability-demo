import { Dataset } from "../dsp/catalog/catalog";

export enum HealthStatus {
  HEALTHY,
  UNRESPONSIVE,
  ERRONEOUS,
  EXITED,
  UNKNOWN,
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
  dataset?: Dataset;
  dataplaneType: string;
  endpointPrefix: string;
  callbackAddress: string;
  managementAddress: string;
  managementToken: string;
  catalogSynchronization: "push" | "pull";
  role: "consumer" | "provider" | "both";
}

export class DataPlane extends DataPlaneStatus {
  dataset?: Dataset;
  dataplaneType: string;
  endpointPrefix: string;
  callbackAddress: string;
  managementAddress: string;
  managementToken: string;
  catalogSynchronization: "push" | "pull";
  role: "consumer" | "provider" | "both";

  constructor(value: IDataPlane) {
    super(value);
    this.dataset = value.dataset;
    this.dataplaneType = value.dataplaneType;
    this.endpointPrefix = value.endpointPrefix;
    this.callbackAddress = value.callbackAddress;
    this.managementAddress = value.managementAddress;
    this.managementToken = value.managementToken;
    this.catalogSynchronization = value.catalogSynchronization;
    this.role = value.role;
  }
}
