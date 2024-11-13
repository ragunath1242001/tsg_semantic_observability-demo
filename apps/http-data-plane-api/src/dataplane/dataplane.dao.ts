import { DatasetConfig } from "@tsg-dsp/http-data-plane-dtos";
import { DataPlaneDetailsDto, DatasetDto } from "@tsg-dsp/common-dsp";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class DataPlaneStateDao {
  @PrimaryColumn({ type: String })
  identifier!: string;

  @Column({ type: String })
  managementToken!: string;

  @Column("simple-json")
  details!: DataPlaneDetailsDto;

  @Column("simple-json", { nullable: true })
  datasetConfig?: DatasetConfig;

  @Column("simple-json")
  dataset!: Array<DatasetDto>;
}
