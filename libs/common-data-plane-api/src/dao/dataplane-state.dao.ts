import { DataPlaneDetailsDto } from "@tsg-dsp/common-dsp";
import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * Standard DAO entity for data plane state
 */
@Entity()
export class DataPlaneStateDao {
  @PrimaryColumn({ type: "int" })
  _id!: number;

  @Column({ type: String })
  id!: string;

  @Column("simple-json")
  details!: DataPlaneDetailsDto;
}
