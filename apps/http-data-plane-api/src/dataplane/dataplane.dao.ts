import { DatasetDto } from "@tsg-dsp/common-dsp";
import { DatasetConfig, PolicyConfig } from "@tsg-dsp/http-data-plane-dtos";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class HttpDatasetConfigDao {
  @PrimaryColumn({ type: String })
  identifier!: string;

  @Column("simple-json", {
    nullable: true,
    transformer: {
      from: (value: any) => DatasetConfig.parse(value),
      to: (value: DatasetConfig) => instanceToPlain(value)
    }
  })
  datasetConfig?: DatasetConfig;
}

@Entity()
export class VersionedDatasetDao {
  @PrimaryColumn({ type: String })
  identifier!: string;

  @Column("simple-json")
  dataset!: DatasetDto;
}

@Entity()
export class DatasetItemDao {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column({ type: String })
  title!: string;

  @Column({ type: String })
  version!: string;

  @Column({ type: String })
  backendUrl!: string;

  @Column({ type: String, nullable: true })
  authorization!: string | null;

  @Column({ type: String, nullable: true })
  mediaType!: string | null;

  @Column({ type: String, nullable: true })
  schemaRef!: string | null;

  @Column({ type: String, nullable: true })
  openApiSpecRef!: string | null;

  @Column("simple-json", {
    nullable: true,
    transformer: {
      from: (value: any[]) => plainToInstance(PolicyConfig, value),
      to: (value: PolicyConfig[]) => instanceToPlain(value)
    }
  })
  policy!: PolicyConfig[] | null;

  @Column("simple-json", { nullable: true })
  dataset!: DatasetDto | null;
}
