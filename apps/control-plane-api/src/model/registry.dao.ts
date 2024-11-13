import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { MetaEntity } from "./common.dao";
import { CatalogDto } from "@tsg-dsp/common-dsp";

@Entity({ name: "registry" })
export class RegistryDao extends MetaEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;
  @Column({ type: String })
  catalogId!: string;
  @Column("simple-json")
  catalogJson!: CatalogDto;
}
