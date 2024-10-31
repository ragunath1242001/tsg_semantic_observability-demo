import { DIDDocument } from "did-resolver";
import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn } from "typeorm";
import { MetaEntity } from "./common.dao.js";
import { DIDLogEntry } from "../did/tdw/method/interfaces.js";

@Entity()
export class DIDDocuments extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("simple-json")
  document!: DIDDocument;
}

@Entity()
export class DIDService extends MetaEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  type!: string;

  @Column()
  serviceEndpoint!: string;
}

@Entity()
export class DIDLogs extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  scid!: string;

  @Column("simple-json")
  logEntry!: DIDLogEntry;
}
