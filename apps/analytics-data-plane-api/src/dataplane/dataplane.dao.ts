import { DataPlaneDetailsDto, DatasetDto } from "@tsg-dsp/common-dsp";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class DataPlaneStateDao {
  @PrimaryColumn({ type: String })
  identifier!: string;

  @Column("simple-json")
  details!: DataPlaneDetailsDto;

  @Column("simple-json")
  dataset!: Array<DatasetDto>;
}
