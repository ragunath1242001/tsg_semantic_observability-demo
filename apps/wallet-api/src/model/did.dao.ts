import { DIDLogEntry } from "@tsg-dsp/common-signing-and-validation";
import { DIDDocument } from "did-resolver";
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

import { MetaEntity } from "./common.dao.js";

@Entity()
export class DIDDocuments extends MetaEntity {
  @PrimaryGeneratedColumn({ type: "integer" })
  id!: number;

  @Column("simple-json")
  document!: DIDDocument;
}

@Entity()
export class DIDService extends MetaEntity {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column({ type: String })
  type!: string;

  @Column({ type: String })
  serviceEndpoint!: string;
}

@Entity()
export class DIDLogs extends MetaEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ type: String })
  scid!: string;

  @Column("simple-json")
  logEntry!: DIDLogEntry;
}
