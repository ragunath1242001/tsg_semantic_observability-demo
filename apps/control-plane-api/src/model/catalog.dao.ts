import { BaseEntity } from "@tsg-dsp/common-api";
import {
  DataService,
  Dataset,
  DatasetDto,
  Distribution,
  ICatalog,
  ICatalogRecord,
  IDataService,
  IDataset,
  IDistribution,
  IResource,
  Policy,
  Resource
} from "@tsg-dsp/common-dsp";
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation
} from "typeorm";

import { jsonLdTransformer, mapToInstances } from "./common.dao.js";
import { DataPlaneDao } from "./dataPlanes.dao.js";

@Entity({ name: "resource" })
export class ResourceDao extends BaseEntity implements IResource {
  @PrimaryColumn({ type: String })
  id!: string;
  @Column({ type: String, nullable: true })
  contactPoint?: string;
  @Column("simple-json", { nullable: true })
  keyword?: Array<string>;
  @Column({ type: String, nullable: true })
  landingPage?: string;
  @Column("simple-json", { nullable: true })
  theme?: Array<string>;
  @Column("simple-json", { nullable: true })
  conformsTo?: Array<string>;
  @Column({ type: String, nullable: true })
  creator?: string;
  @Column("simple-json", { nullable: true })
  description?: Array<string>;
  @Column({ type: String, nullable: true })
  identifier?: string;
  @Column({ type: String, nullable: true })
  isReferencedBy?: string;
  @Column({ type: String, nullable: true })
  issued?: string;
  @Column({ type: String, nullable: true })
  language?: string;
  @Column({ type: String, nullable: true })
  license?: string;
  @Column({ type: String, nullable: true })
  modified?: string;
  @Column({ type: String, nullable: true })
  publisher?: string;
  @Column({ type: String, nullable: true })
  relation?: string;
  @Column({ type: String, nullable: true })
  title?: string;
  @Column({ type: String, nullable: true })
  type?: string;
  @Column("simple-json", { nullable: true })
  hasVersion?: string[];
  @Column({ type: String, nullable: true })
  isVersionOf?: string;
  @Column({ type: String, nullable: true })
  version?: string;
  @Column({ type: String, nullable: true })
  hasCurrentVersion?: string;
  @Column({ type: String, nullable: true })
  previousVersion?: string;
  @Column("simple-json", { nullable: true })
  extraProps?: Record<string, any>;
  // Todo Many-to-Many, JoinTable
  @Column("simple-json", {
    nullable: true,
    transformer: jsonLdTransformer
  })
  hasPolicy?: Array<Policy>;
}

export abstract class ResourceChild extends BaseEntity {
  _resource: ResourceDao | undefined;

  get contactPoint() {
    return this._resource?.contactPoint;
  }
  get keyword() {
    return this._resource?.keyword;
  }
  get landingPage() {
    return this._resource?.landingPage;
  }
  get theme() {
    return this._resource?.theme;
  }
  get conformsTo() {
    return this._resource?.conformsTo;
  }
  get creator() {
    return this._resource?.creator;
  }
  get description() {
    return this._resource?.description;
  }
  get identifier() {
    return this._resource?.id;
  }
  get isReferencedBy() {
    return this._resource?.isReferencedBy;
  }
  get issued() {
    return this._resource?.issued;
  }
  get language() {
    return this._resource?.language;
  }
  get license() {
    return this._resource?.license;
  }
  get modified() {
    return this._resource?.modified;
  }
  get publisher() {
    return this._resource?.publisher;
  }
  get relation() {
    return this._resource?.relation;
  }
  get title() {
    return this._resource?.title;
  }
  get type() {
    return this._resource?.type;
  }
  get hasVersion() {
    return this._resource?.hasVersion;
  }
  get isVersionOf() {
    return this._resource?.isVersionOf;
  }
  get version() {
    return this._resource?.version;
  }
  get hasCurrentVersion() {
    return this._resource?.hasCurrentVersion;
  }
  get previousVersion() {
    return this._resource?.previousVersion;
  }
  get hasPolicy() {
    return this._resource?.hasPolicy;
  }
}

@Entity({ name: "dataservice" })
export class DataServiceDao extends ResourceChild implements IDataService {
  @PrimaryColumn({ type: String })
  id!: string;
  @ManyToOne(() => CatalogDao, { nullable: true })
  _catalog?: Relation<CatalogDao>;
  @OneToOne(() => ResourceDao, { cascade: true, eager: true })
  @JoinColumn()
  declare _resource: ResourceDao | undefined;

  @Column({ type: String, nullable: true })
  endpointDescription?: string;
  @Column({ type: String, nullable: true })
  endpointURL?: string;
  @Column("simple-json", { nullable: true })
  extraProps?: Record<string, any>;

  @ManyToMany(() => DatasetDao, { nullable: true, cascade: true })
  @JoinTable()
  _servesDataset?: Array<Relation<DatasetDao>>;
  get servesDataset(): Dataset<DatasetDto>[] | undefined {
    return mapToInstances(this._servesDataset, Dataset);
  }
}

@Entity({ name: "distribution" })
export class DistributionDao extends BaseEntity implements IDistribution {
  @PrimaryColumn({ type: String })
  id!: string;
  @ManyToOne(() => DataServiceDao, { nullable: true, cascade: true })
  @JoinTable()
  _accessService?: DataServiceDao;
  get accessService(): DataService | undefined {
    return this._accessService
      ? new DataService(this._accessService)
      : undefined;
  }
  @Column({ type: String, nullable: true })
  accessURL?: string;
  @Column({ type: String, nullable: true })
  byteSize?: string;
  @Column({ type: String, nullable: true })
  compressFormat?: string;
  @Column({ type: String, nullable: true })
  downloadURL?: string;
  @Column({ type: String, nullable: true })
  mediaType?: string;
  @Column({ type: String, nullable: true })
  packageFormat?: string;
  @Column({ type: String, nullable: true })
  spatialResolutionInMeters?: string;
  @Column({ type: String, nullable: true })
  temporalResolution?: string;
  @Column("simple-json", { nullable: true })
  conformsTo?: Array<string>;
  @Column("simple-json", { nullable: true })
  description?: Array<string>;
  @Column({ type: String, nullable: true })
  format?: string;
  @Column({ type: String, nullable: true })
  issued?: string;
  @Column({ type: String, nullable: true })
  modified?: string;
  @Column({ type: String, nullable: true })
  title?: string;
  @Column("simple-json", { nullable: true })
  extraProps?: Record<string, any>;
  // TODO: Relationship with PolicyDao
  @Column("simple-json", {
    nullable: true,
    transformer: jsonLdTransformer
  })
  hasPolicy?: Array<Policy>;
}

@Entity({ name: "dataset" })
export class DatasetDao extends ResourceChild implements IDataset {
  @PrimaryColumn({ type: String })
  id!: string;

  @OneToOne(() => ResourceDao, { cascade: true, eager: true })
  @JoinColumn()
  declare _resource: ResourceDao | undefined;

  @ManyToOne(() => DataPlaneDao, { nullable: true })
  _dataPlane?: Relation<DataPlaneDao>;

  @ManyToOne(() => CatalogDao, { nullable: true })
  _catalog?: Relation<CatalogDao>;
  @ManyToMany(() => DistributionDao, { nullable: true, cascade: true })
  @JoinTable()
  _distribution?: Array<DistributionDao>;
  get distribution(): Array<Distribution> | undefined {
    return mapToInstances(this._distribution, Distribution);
  }
  @Column({ type: String, nullable: true })
  spatialResolutionInMeters?: string;
  @Column({ type: String, nullable: true })
  temporalResolution?: string;
  @Column({ type: String, nullable: true })
  accrualPeriodicity?: string;
  @Column({ type: String, nullable: true })
  spatial?: string;
  @Column({ type: String, nullable: true })
  temporal?: string;
  @Column("simple-json", { nullable: true })
  wasGeneratedBy?: any;
  @Column("simple-json", { nullable: true })
  hasCodingSystem?: string[];
  @Column({ type: Number, nullable: true })
  numberOfRecords?: number;
  @Column({ type: Number, nullable: true })
  numberOfUniqueIndividuals?: number;
  @Column("simple-json", { nullable: true })
  healthTheme?: string[];
  @Column("simple-json", { nullable: true })
  extraProps?: Record<string, any>;
  @ManyToOne(() => DistributionDao, { nullable: true, cascade: true })
  _sample?: DistributionDao;
  get sample(): Distribution | undefined {
    return this._sample ? new Distribution(this._sample) : undefined;
  }
}

@Entity({ name: "catalogrecord" })
export class CatalogRecordDao extends BaseEntity implements ICatalogRecord {
  @PrimaryColumn({ type: String })
  id!: string;
  @ManyToOne(() => CatalogDao, { nullable: true })
  _catalog?: Relation<CatalogDao>;
  @Column("simple-json", { nullable: true })
  conformsTo?: Array<string>;
  @Column("simple-json", { nullable: true })
  description?: Array<string>;
  @Column({ type: String, nullable: true })
  issued?: Date;
  @Column({ type: String, nullable: true })
  modified?: Date;
  @Column({ type: String, nullable: true })
  title?: string;
  @Column("simple-json", { nullable: true })
  extraProps?: Record<string, any>;
  @OneToOne(() => ResourceDao, { cascade: true })
  @JoinColumn()
  _primaryTopic?: Resource;
  get primaryTopic(): Resource | undefined {
    return this._primaryTopic ? new Resource(this._primaryTopic) : undefined;
  }
}

export abstract class DatasetChild extends BaseEntity {
  _dataset: DatasetDao | undefined;

  get distribution() {
    return this._dataset?.distribution;
  }
  get spatialResolutionInMeters() {
    return this._dataset?.spatialResolutionInMeters;
  }
  get temporalResolution() {
    return this._dataset?.temporalResolution;
  }
  get accrualPeriodicity() {
    return this._dataset?.accrualPeriodicity;
  }
  get spatial() {
    return this._dataset?.spatial;
  }
  get temporal() {
    return this._dataset?.temporal;
  }
  get wasGeneratedBy() {
    return this._dataset?.wasGeneratedBy;
  }

  get contactPoint() {
    return this._dataset?.contactPoint;
  }
  get keyword() {
    return this._dataset?.keyword;
  }
  get landingPage() {
    return this._dataset?.landingPage;
  }
  get theme() {
    return this._dataset?.theme;
  }
  get conformsTo() {
    return this._dataset?.conformsTo;
  }
  get creator() {
    return this._dataset?.creator;
  }
  get description() {
    return this._dataset?.description;
  }
  get identifier() {
    return this._dataset?.id;
  }
  get isReferencedBy() {
    return this._dataset?.isReferencedBy;
  }
  get issued() {
    return this._dataset?.issued;
  }
  get language() {
    return this._dataset?.language;
  }
  get license() {
    return this._dataset?.license;
  }
  get modified() {
    return this._dataset?.modified;
  }
  get publisher() {
    return this._dataset?.publisher;
  }
  get relation() {
    return this._dataset?.relation;
  }
  get title() {
    return this._dataset?.title;
  }
  get type() {
    return this._dataset?.type;
  }
  get hasPolicy() {
    return this._dataset?.hasPolicy;
  }
}

@Entity({ name: "catalog" })
export class CatalogDao extends DatasetChild implements ICatalog {
  @PrimaryColumn({ type: String })
  id!: string;
  @Column({ type: String, nullable: true })
  participantId!: string;
  @OneToMany(() => DatasetDao, (dataset) => dataset._catalog, { cascade: true })
  _datasets?: Array<Relation<DatasetDao>>;
  get dataset(): Array<Dataset> | undefined {
    return mapToInstances(this._datasets, Dataset);
  }
  @OneToOne(() => DatasetDao, { eager: true })
  @JoinColumn()
  declare _dataset: Relation<DatasetDao> | undefined;
  @Column({ type: String, nullable: true })
  themeTaxonomy?: string;
  @Column({ type: String, nullable: true })
  homepage?: string;
  @Column("simple-json", { nullable: true })
  extraProps?: Record<string, any>;

  @OneToMany(
    () => CatalogRecordDao,
    (catalogrecord) => catalogrecord._catalog,
    { cascade: true }
  )
  _records?: Array<CatalogRecordDao>;
  @OneToMany(() => DataServiceDao, (dataservice) => dataservice._catalog, {
    cascade: true
  })
  _services?: Array<DataServiceDao>;
  get service(): Array<DataService> | undefined {
    return mapToInstances(this._services, DataService);
  }
}
