import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, Relation } from "typeorm";
import { MetaEntity, mapToInstances } from "../../common.dao";
import { CatalogRecord, DataService, Dataset, Distribution, ICatalog, ICatalogRecord, IDataService, IDataset, IDistribution, IResource, Resource } from "./catalog";
import { Reference, Multilanguage, Time, Decimal, Duration } from "../common";
import { Policy } from "../negotiation/negotiation";
import { DatasetDto } from "./catalog.dto";


@Entity({name: "resource"})
export class ResourceDao extends MetaEntity implements IResource {
  @Column({unique: true})
  id!: string
  @Column("simple-json", {nullable: true})
  contactPoint?: Reference;
  @Column("simple-json", {nullable: true})
  keyword?: Array<Multilanguage>;
  @Column("simple-json", {nullable: true})
  landingPage?: Reference;
  @Column("simple-json", {nullable: true})
  theme?: Array<Reference>;
  @Column("simple-json", {nullable: true})
  conformsTo?: Reference;
  @Column("simple-json", {nullable: true})
  creator?: Reference;
  @Column("simple-json", {nullable: true})
  description?: Array<Multilanguage>;
  @Column({nullable: true})
  identifier?: string;
  @Column("simple-json", {nullable: true})
  isReferencedBy?: Reference;
  @Column("simple-json", {nullable: true})
  issued?: Time;
  @Column("simple-json", {nullable: true})
  language?: Reference;
  @Column("simple-json", {nullable: true})
  license?: Reference;
  @Column("simple-json", {nullable: true})
  modified?: Time;
  @Column({nullable: true})
  publisher?: string;
  @Column("simple-json", {nullable: true})
  relation?: Reference;
  @Column({nullable: true})
  title?: string;
  @Column({nullable: true})
  type?: string;
  // Todo Many-to-Many, JoinTable
  @Column("simple-json", {nullable: true})
  hasPolicy?: Array<Policy>;
}

@Entity({name: "dataservice"})
export class DataServiceDao extends MetaEntity implements IDataService {
  @ManyToOne(() => CatalogDao, {nullable: true})
  _catalog?: Relation<CatalogDao>
  @OneToOne(() => ResourceDao, {cascade: true, eager: true})
  @JoinColumn()
  _resource: ResourceDao | undefined
  @Column("simple-json", {nullable: true})
  endpointDescription?: Reference;
  @Column({nullable: true})
  endpointURL?: string;

  @ManyToMany(() => DatasetDao, {nullable: true, cascade: true})
  @JoinTable()
  _servesDataset?: Array<Relation<DatasetDao>>;
  get servesDataset(): Dataset<DatasetDto>[] | undefined {
    return mapToInstances(this._servesDataset, Dataset)
  }
}

@Entity({name: "distribution"})
export class DistributionDao extends MetaEntity implements IDistribution {
  @Column({unique: true})
  id!: string
  @ManyToMany(() => DataServiceDao, {nullable: true, cascade: true})
  @JoinTable()
  _accessService?: Array<DataServiceDao>;
  get accessService(): Array<DataService> | undefined {
    return mapToInstances(this._accessService, DataService)
  }
  @Column("simple-json", {nullable: true})
  accessURL?: Reference;
  @Column("simple-json", {nullable: true})
  byteSize?: Decimal;
  @Column("simple-json", {nullable: true})
  compressFormat?: Reference;
  @Column("simple-json", {nullable: true})
  downloadURL?: Reference;
  @Column("simple-json", {nullable: true})
  mediaType?: Reference;
  @Column("simple-json", {nullable: true})
  packageFormat?: Reference;
  @Column("simple-json", {nullable: true})
  spatialResolutionInMeters?: Decimal;
  @Column("simple-json", {nullable: true})
  temporalResolution?: Duration;
  @Column("simple-json", {nullable: true})
  conformsTo?: Reference;
  @Column("simple-json", {nullable: true})
  description?: Array<Multilanguage>;
  @Column({nullable: true})
  format?: string;
  @Column("simple-json", {nullable: true})
  issued?: Time;
  @Column("simple-json", {nullable: true})
  modified?: Time;
  @Column({nullable: true})
  title?: string;
  // TODO: Relationship with PolicyDao
  @Column("simple-json", {nullable: true})
  hasPolicy?: Array<Policy>;
}

@Entity({name: "dataset"})
export class DatasetDao extends MetaEntity implements IDataset {
  @Column({unique: true})
  id!: string
  @OneToOne(() => ResourceDao, {cascade: true, eager: true})
  @JoinColumn()
  _resource: ResourceDao | undefined
  @ManyToOne(() => CatalogDao, {nullable: true})
  _catalog?: Relation<CatalogDao>
  @ManyToMany(() => DataServiceDao, {nullable: true, cascade: true})
  @JoinTable()
  _distribution?: Array<DistributionDao>;
  get distribution(): Array<Distribution> | undefined {
    return mapToInstances(this._distribution, Distribution)
  }
  @Column("simple-json", {nullable: true})
  spatialResolutionInMeters?: Reference;
  @Column("simple-json", {nullable: true})
  temporalResolution?: Duration;
  @Column("simple-json", {nullable: true})
  accrualPeriodicity?: Reference;
  @Column("simple-json", {nullable: true})
  spatial?: Reference;
  @Column("simple-json", {nullable: true})
  temporal?: Reference;
  @Column("simple-json", {nullable: true})
  wasGeneratedBy?: Reference;
}

@Entity({name: "catalogrecord"})
export class CatalogRecordDao extends MetaEntity implements ICatalogRecord {
  @Column({unique: true})
  id!: string
  @ManyToOne(() => CatalogDao, {nullable: true})
  _catalog?: Relation<CatalogDao>
  @Column("simple-json", {nullable: true})
  conformsTo?: Reference;
  @Column("simple-json", {nullable: true})
  description?: Array<Multilanguage>;
  @Column("simple-json", {nullable: true})
  issued?: Date;
  @Column("simple-json", {nullable: true})
  modified?: Date;
  @Column({nullable: true})
  title?: string;
  @OneToOne(() => ResourceDao, {cascade: true})
  @JoinColumn()
  _primaryTopic?: Resource;
  get primaryTopic(): Resource | undefined {
    return (this._primaryTopic) ? new Resource(this._primaryTopic) : undefined;
  }
}

@Entity({name: "catalog"})
export class CatalogDao extends MetaEntity implements ICatalog {
  @Column({unique: true})
  id!: string
  @OneToMany(() => DatasetDao, (dataset) => dataset._catalog, {cascade: true})
  _datasets?: Array<Relation<DatasetDao>>;
  get dataset(): Array<Dataset> | undefined {
    return mapToInstances(this._datasets, Dataset)
  }
  @OneToOne(() => DatasetDao, {eager: true})
  @JoinColumn()
  _dataset: Relation<DatasetDao> | undefined
  @Column("simple-json", {nullable: true})
  themeTaxonomy?: Reference;
  @Column("simple-json", {nullable: true})
  homepage?: Reference;

  @OneToMany(() => CatalogRecordDao, (catalogrecord) => catalogrecord._catalog, {cascade: true})
  _records?: Array<CatalogRecord>;
  @OneToMany(() => DataServiceDao, (dataservice) => dataservice._catalog, {cascade: true})
  _services?: Array<DataService>;
  get service(): Array<DataService> | undefined {
    return mapToInstances(this._services, DataService)
  }

  @ManyToOne(() => CatalogDao, (catalog) => catalog.children, {nullable: true})
  parent?: Relation<CatalogDao>

  @OneToMany(() => CatalogDao, (catalog) => catalog.parent, {nullable: true})
  children?: Relation<CatalogDao>

}