import { CatalogDto } from "@tsg-dsp/common-dsp";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { MetaEntity } from "./common.dao.js";

@Entity({ name: "registry" })
export class RegistryDao extends MetaEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;
  @Column({ type: String })
  catalogId!: string;
  @Column({ type: String })
  participantId!: string;
  @Column("simple-json")
  catalogJson!: CatalogDto;
}
