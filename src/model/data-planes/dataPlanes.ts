import { Dataset } from "../dsp/catalog/catalog";

export enum HealthStatus {
  HEALTHY, UNRESPONSIVE, ERRONEOUS, EXITED, UNKNOWN
}

export interface IDataPlaneDetails {
    identifier: string;
    dataplaneType: string;
    endpointPrefix: string;
    callbackAddress: string;
    managementAddress: string;
    managementToken: string;
    catalogSynchronization: "push" | "pull";
    role: "consumer" | "provider" | "both"
  }
export class DataPlaneDetails {
  identifier: string;
  dataplaneType: string;
  endpointPrefix: string;
  callbackAddress: string;
  managementAddress: string;
  managementToken: string;
  catalogSynchronization: "push" | "pull";
  role: "consumer" | "provider" | "both"

  constructor(value: IDataPlaneDetails) {
    this.identifier = value.identifier;
    this.dataplaneType = value.dataplaneType
    this.endpointPrefix = value.endpointPrefix
    this.callbackAddress = value.callbackAddress
    this.managementAddress = value.managementAddress
    this.managementToken = value.managementToken
    this.catalogSynchronization = value.catalogSynchronization
    this.role = value.role
  }
}

export interface IDataPlaneStatus {
  identifier: string;
  created?: Date;
  modified?: Date;
  details: DataPlaneDetails;
  health: HealthStatus;
  missedHealthChecks: number;
  dataset?: Dataset;
  etag?: string
}

export class DataPlaneStatus {
  identifier: string;
  created?: Date;
  modified?: Date;
  details: DataPlaneDetails;
  health: HealthStatus;
  missedHealthChecks: number;
  dataset?: Dataset;
  etag?: string

  constructor(value: IDataPlaneStatus) {
    this.identifier = value.identifier;
    this.created = value.created
    this.modified = value.modified
    this.details = value.details
    this.health = value.health
    this.missedHealthChecks = value.missedHealthChecks
    this.dataset = value.dataset
    this.etag = value.etag
  }
}