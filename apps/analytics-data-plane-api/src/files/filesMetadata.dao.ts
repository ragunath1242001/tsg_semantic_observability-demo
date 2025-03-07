import { IsOptional } from "class-validator";
import { Column, Entity, PrimaryColumn } from "typeorm";

import { CSVW } from "./files.dto.js";

@Entity({ name: "metadata" })
export class FileMetadataDao {
  @PrimaryColumn({ type: String })
  identifier!: string;

  @Column({ type: "int" })
  fileSizeInBytes!: number;

  @Column({ type: String })
  fileName!: string;

  @Column({ type: Boolean })
  presentInLastCheck!: boolean;

  @Column({ type: "simple-json", nullable: true })
  @IsOptional()
  csvw?: CSVW;
}
