import { DatasetConfig } from "@libs/http-data-plane-dtos";
import { DataPlaneDetailsDto, DatasetDto } from "@libs/common-dsp";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class DataPlaneStateDao {
  @PrimaryColumn()
  identifier!: string;

  @Column()
  managementToken!: string;

  @Column("simple-json")
  details!: DataPlaneDetailsDto;

  @Column("simple-json", { nullable: true })
  datasetConfig?: DatasetConfig;

  @Column("simple-json")
  dataset!: Array<DatasetDto>;
}
