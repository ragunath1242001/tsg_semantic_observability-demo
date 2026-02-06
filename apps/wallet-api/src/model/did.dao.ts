import { DIDLogEntry } from "@tsg-dsp/common-signing-and-validation";
import { DIDDocument } from "did-resolver";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { MetaEntity, TimestampEntity } from "./common.dao.js";

@Entity()
export class DIDDocuments extends TimestampEntity {
  @PrimaryGeneratedColumn({ type: "integer" })
  id!: number;

  @Column("simple-json")
  document!: DIDDocument;
}

@Entity()
export class DIDService extends MetaEntity {
  @Column({ type: String })
  type!: string;

  @Column({ type: String })
  serviceEndpoint!: string;
}

@Entity()
export class DIDLogs extends TimestampEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ type: String })
  scid!: string;

  @Column("simple-json")
  logEntry!: DIDLogEntry;
}
