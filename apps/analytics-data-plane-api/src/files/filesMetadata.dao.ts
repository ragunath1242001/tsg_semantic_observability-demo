import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "metadata" })
export class FileMetadataDao {
  @PrimaryColumn()
  identifier!: string;

  @Column()
  fileSizeInBytes!: number;

  @Column()
  fileName!: string;

  @Column()
  presentInLastCheck!: boolean;
}
