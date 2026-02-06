import { DatasetDto } from "@tsg-dsp/common-dsp";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class DatasetDao {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column("simple-json")
  dataset!: DatasetDto;
}
