export enum HealthStatus {
  HEALTHY,
  UNRESPONSIVE,
  ERRONEOUS,
  EXITED,
  UNKNOWN
}
export interface IDataPlaneStatus {
  identifier: string;
  title: string;
  created?: Date;
  modified?: Date;
  health: HealthStatus;
  missedHealthChecks: number;
  etag?: string;
}

export class DataPlaneStatus {
  identifier: string;
  title: string;
  created?: Date;
  modified?: Date;
  health: HealthStatus;
  missedHealthChecks: number;
  etag?: string;

  constructor(value: IDataPlaneStatus) {
    this.identifier = value.identifier;
    this.title = value.title;
    this.created = value.created;
    this.modified = value.modified;
    this.health = value.health;
    this.missedHealthChecks = value.missedHealthChecks;
    this.etag = value.etag;
  }
}

export interface IDataPlane extends IDataPlaneStatus {
  dataplaneType: string;
  endpointPrefix: string;
  callbackAddress: string;
  managementAddress: string;
  catalogSynchronization: "push" | "pull";
  role: "consumer" | "provider" | "both";
}

export class DataPlane extends DataPlaneStatus {
  dataplaneType: string;
  endpointPrefix: string;
  callbackAddress: string;
  managementAddress: string;
  catalogSynchronization: "push" | "pull";
  role: "consumer" | "provider" | "both";

  constructor(value: IDataPlane) {
    super(value);
    this.dataplaneType = value.dataplaneType;
    this.endpointPrefix = value.endpointPrefix;
    this.callbackAddress = value.callbackAddress;
    this.managementAddress = value.managementAddress;
    this.catalogSynchronization = value.catalogSynchronization;
    this.role = value.role;
  }
}
