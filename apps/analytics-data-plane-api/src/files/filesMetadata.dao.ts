import { CSVW } from "@tsg-dsp/analytics-data-plane-dtos";
import { IsOptional } from "class-validator";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "metadata" })
export class FileMetadataDao {
  @PrimaryColumn({ type: String })
  identifier!: string;

  @Column({ type: "int" })
  fileSizeInBytes!: number;

  @Column({ type: String })
  fileName!: string;

  @Column({ type: String })
  originalFileName!: string;

  @Column({ type: String })
  mediaType!: string;

  @Column({ type: Boolean })
  presentInLastCheck!: boolean;

  @Column({ type: "simple-json", nullable: true })
  @IsOptional()
  csvw?: CSVW;

  @Column({ type: String, nullable: true })
  datasetId?: string;
}
