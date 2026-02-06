import { MetaEntity } from "@tsg-dsp/common-api";
import { CatalogDto } from "@tsg-dsp/common-dsp";
import { Column, Entity } from "typeorm";

@Entity({ name: "registry" })
export class RegistryDao extends MetaEntity {
  @Column({ type: String })
  catalogId!: string;
  @Column({ type: String })
  participantId!: string;
  @Column("simple-json")
  catalogJson!: CatalogDto;
}
