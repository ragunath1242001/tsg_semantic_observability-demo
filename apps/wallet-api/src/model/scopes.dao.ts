import { PresentationDefinition } from "@tsg-dsp/common-dtos";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { MetaEntity } from "./common.dao.js";

@Entity()
export class ScopeDao extends MetaEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: String, unique: true })
  alias!: string;

  @Column({ type: String, unique: true })
  discriminator!: string;

  @Column({ type: String })
  description!: string;

  @Column({ type: "simple-json" })
  presentationDefinition!: PresentationDefinition;
}
