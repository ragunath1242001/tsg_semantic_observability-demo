import { Dataset, HealthStatus, IDataPlane } from "@tsg-dsp/common";
import { Column, Entity, OneToMany, PrimaryColumn, Relation } from "typeorm";
import { DatasetDao } from "./catalog.dao";
import { MetaEntity } from "./common.dao";

@Entity({ name: "dataplanedetails" })
export class DataPlaneDao extends MetaEntity implements IDataPlane {
  @PrimaryColumn()
  identifier!: string;
  @Column("simple-json", { nullable: true })
  created?: Date;
  @Column("simple-json", { nullable: true })
  modified?: Date;
  @Column()
  health!: HealthStatus;
  @Column()
  missedHealthChecks!: number;
  @OneToMany(() => DatasetDao, (dataset) => dataset._dataPlane, {
    cascade: true,
    eager: true,
  })
  _datasets?: Array<Relation<DatasetDao>> | undefined;
  get datasets(): Array<Dataset> | undefined {
    return this._datasets?.map((dataset) => new Dataset(dataset));
  }
  @Column({ nullable: true })
  etag?: string;
  @Column()
  dataplaneType!: string;
  @Column()
  endpointPrefix!: string;
  @Column()
  callbackAddress!: string;
  @Column()
  managementAddress!: string;
  @Column()
  managementToken!: string;
  @Column()
  catalogSynchronization!: "push" | "pull";
  @Column()
  role!: "consumer" | "provider" | "both";
}
