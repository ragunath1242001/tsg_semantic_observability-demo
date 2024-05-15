import { Column, Entity, PrimaryColumn } from "typeorm";
import { MetaEntity } from "./common.dao.js";

@Entity()
export class JSONLDContext extends MetaEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  credentialType!: string;

  @Column()
  issuable!: boolean;

  @Column({ nullable: true })
  documentUrl?: string;

  @Column("simple-json", { nullable: true })
  document?: Record<string, any>;

  @Column("simple-json", { nullable: true })
  schema?: Record<string, any>;
}
