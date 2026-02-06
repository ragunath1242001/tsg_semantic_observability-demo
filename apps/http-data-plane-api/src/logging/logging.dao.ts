import { MetaEntity } from "@tsg-dsp/common-api";
import { Column, CreateDateColumn, Entity } from "typeorm";

import { LogEntry } from "./logging.dto.js";

@Entity()
export class IngressLogDao extends MetaEntity implements LogEntry {
  @CreateDateColumn({ type: String })
  date!: Date;

  @Column({ type: String, length: 100 })
  remoteParty!: string;

  @Column({ type: String, length: 100 })
  transferId!: string;

  @Column({ type: String, length: 100 })
  datasetId!: string;

  @Column({ type: String, length: 100 })
  path!: string;

  @Column({ type: String, length: 10 })
  method!: string;

  @Column("smallint")
  status!: number;

  @Column("simple-json", { nullable: true })
  debug?: any;
}

@Entity()
export class EgressLogDao extends MetaEntity implements LogEntry {
  @CreateDateColumn({ type: String })
  date!: Date;

  @Column({ type: String, length: 100 })
  remoteParty!: string;

  @Column({ type: String, length: 100 })
  transferId!: string;

  @Column({ type: String, length: 100 })
  datasetId!: string;

  @Column({ type: String, length: 100 })
  path!: string;

  @Column({ type: String, length: 10 })
  method!: string;

  @Column("smallint")
  status!: number;

  @Column("simple-json", { nullable: true })
  debug?: any;
}
