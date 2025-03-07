import { Column, Entity, PrimaryColumn } from "typeorm";

import { MetaEntity } from "./common.dao.js";

@Entity()
export class JSONLDContext extends MetaEntity {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column({ type: String })
  credentialType!: string;

  @Column({ type: Boolean })
  issuable!: boolean;

  @Column({ type: String, nullable: true })
  documentUrl?: string;

  @Column("simple-json", { nullable: true })
  document?: Record<string, any>;

  @Column("simple-json", { nullable: true })
  schema?: Record<string, any>;
}
