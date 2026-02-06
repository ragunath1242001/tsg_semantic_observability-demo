import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { TimestampEntity } from "./common.dao.js";

@Entity()
export class SIToken extends TimestampEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ type: String, nullable: true })
  accessToken?: string;

  @Column({ type: String })
  audience!: string;

  @Column({ type: String, nullable: true })
  scope?: string;
}
