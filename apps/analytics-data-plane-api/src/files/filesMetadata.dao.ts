import { CSVW, MetadataStatus } from "@tsg-dsp/analytics-data-plane-dtos";
import { OwnableEntity } from "@tsg-dsp/common-api";
import { Resource } from "@tsg-dsp/common-dtos";
import { IsOptional } from "class-validator";
import { Column, Entity } from "typeorm";

@Entity({ name: "metadata" })
export class FileMetadataDao extends OwnableEntity {
  readonly resourceType = Resource.ADP_FILE;

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

  @Column({ type: Boolean, nullable: true })
  inlineCsvw?: boolean;

  @Column({ type: String, nullable: true })
  datasetId?: string;

  @Column({ type: String, default: MetadataStatus.PENDING })
  metadataStatus!: MetadataStatus;

  @Column({ type: String, nullable: true })
  @IsOptional()
  metadataError?: string;
}
