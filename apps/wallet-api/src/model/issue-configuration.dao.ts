import { Column, Entity, PrimaryColumn } from "typeorm";

import { MetaEntity } from "./common.dao.js";

@Entity()
export class IssueConfiguration extends MetaEntity {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column({ type: String })
  credentialType!: string;

  @Column({ type: String, nullable: true })
  documentUrl?: string;

  @Column("simple-json", { nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document?: Record<string, any>;

  @Column("simple-json", { nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: Record<string, any>;

  @Column({ type: String, nullable: true })
  name?: string;

  @Column({ type: String, nullable: true })
  description?: string;

  @Column({ type: String, nullable: true })
  backgroundColor?: string;

  @Column({ type: String, nullable: true })
  backgroundImage?: string;

  @Column({ type: String, nullable: true })
  textColor?: string;

  @Column({ type: String, default: "jwt" })
  proofType: "jwt" | "ldp" = "jwt";
}
