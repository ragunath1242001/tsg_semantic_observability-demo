import { Column, Entity, PrimaryColumn } from "typeorm";

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
}
