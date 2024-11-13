import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn
} from "typeorm";
import { LogEntry } from "./logging.dto";

@Entity()
export class IngressLogDao implements LogEntry {
  @PrimaryGeneratedColumn("increment")
  identifier!: number;

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
export class EgressLogDao implements LogEntry {
  @PrimaryGeneratedColumn("increment")
  identifier!: number;

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
