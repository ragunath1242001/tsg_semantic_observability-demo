import { IsOptional } from "class-validator";
import { Column, Entity, PrimaryColumn } from "typeorm";

export interface CSVW {
  "@context": string[];
  tables: {
    url: string;
    tableSchema: {
      columns: {
        name: string;
      }[];
    };
    dialect: {
      header: boolean;
    };
  }[];
}

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
