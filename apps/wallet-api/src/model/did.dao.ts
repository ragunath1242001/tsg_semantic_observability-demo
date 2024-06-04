import { DIDDocument } from "did-resolver";
import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn } from "typeorm";
import { MetaEntity } from "./common.dao.js";

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
