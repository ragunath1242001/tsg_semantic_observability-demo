import { DatasetConfig } from "@libs/dtos";
import { DataPlaneDetailsDto, DatasetDto } from "@tsg-dsp/common";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class DataPlaneStateDao {
  @PrimaryColumn()
  identifier!: string;

  @Column()
  managementToken!: string;

  @Column("simple-json")
  details!: DataPlaneDetailsDto;

  @Column("simple-json")
  datasetConfig!: DatasetConfig;

  @Column("simple-json")
  dataset!: Array<DatasetDto>;
}
