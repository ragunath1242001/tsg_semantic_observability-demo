import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn
} from "typeorm";
import { LogEntry } from "./logging.dto";

@Entity()
export class IngressLogDao implements LogEntry {
  @PrimaryGeneratedColumn()
  identifier!: number;

  @CreateDateColumn()
  date!: Date;

  @Column("varchar", { length: 100 })
  remoteParty!: string;

  @Column("varchar", { length: 100 })
  transferId!: string;

  @Column("varchar", { length: 100 })
  datasetId!: string;

  @Column("varchar", { length: 100 })
  path!: string;

  @Column("varchar", { length: 10 })
  method!: string;

  @Column("smallint")
  status!: number;

  @Column("simple-json", { nullable: true })
  debug?: any;
}

@Entity()
export class EgressLogDao implements LogEntry {
  @PrimaryGeneratedColumn()
  identifier!: number;

  @CreateDateColumn()
  date!: Date;

  @Column("varchar", { length: 100 })
  remoteParty!: string;

  @Column("varchar", { length: 100 })
  transferId!: string;

  @Column("varchar", { length: 100 })
  datasetId!: string;

  @Column("varchar", { length: 100 })
  path!: string;

  @Column("varchar", { length: 10 })
  method!: string;

  @Column("smallint")
  status!: number;

  @Column("simple-json", { nullable: true })
  debug?: any;
}
