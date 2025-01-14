import { Dataset, HealthStatus, IDataPlane } from "@tsg-dsp/common-dsp";
import { Column, Entity, OneToMany, PrimaryColumn, Relation } from "typeorm";
import { DatasetDao } from "./catalog.dao.js";
import { MetaEntity } from "./common.dao.js";

@Entity({ name: "dataplanedetails" })
export class DataPlaneDao extends MetaEntity implements IDataPlane {
  @PrimaryColumn({ type: String })
  identifier!: string;
  @Column({ type: String, nullable: true })
  created?: Date;
  @Column({ type: String, nullable: true })
  modified?: Date;
  @Column({ type: "simple-enum", enum: HealthStatus })
  health!: HealthStatus;
  @Column({ type: "int" })
  missedHealthChecks!: number;
  @OneToMany(() => DatasetDao, (dataset) => dataset._dataPlane, {
    cascade: true,
    eager: true
  })
  _datasets?: Array<Relation<DatasetDao>> | undefined;
  get datasets(): Array<Dataset> | undefined {
    return this._datasets?.map((dataset) => new Dataset(dataset));
  }
  @Column({ type: String, nullable: true })
  etag?: string;
  @Column({ type: String })
  dataplaneType!: string;
  @Column({ type: String })
  endpointPrefix!: string;
  @Column({ type: String })
  callbackAddress!: string;
  @Column({ type: String })
  managementAddress!: string;
  @Column({ type: String })
  managementToken!: string;
  @Column({ type: String })
  catalogSynchronization!: "push" | "pull";
  @Column({ type: String })
  role!: "consumer" | "provider" | "both";
}
