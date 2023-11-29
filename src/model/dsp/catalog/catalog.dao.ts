import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, ObjectType, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, Relation } from "typeorm";
import { MetaEntity, mapToInstances } from "../../common.dao";
import { CatalogRecord, DataService, Dataset, Distribution, ICatalog, ICatalogRecord, IDataService, IDataset, IDistribution, IResource, Resource } from "./catalog";
import { Reference, Multilanguage, Time, Decimal, Duration, SerializableClass } from "../common";
import { Policy } from "../negotiation/negotiation";
import { DatasetDto } from "./catalog.dto";


@Entity({name: "resource"})
export class ResourceDao extends MetaEntity implements IResource {
  @Column({unique: true})
  id!: string
  @ManyToOne(() => CatalogDao)
  _catalog?: Relation<CatalogDao>
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
export class DataServiceDao extends ResourceDao implements IDataService {
  @ManyToOne(() => CatalogDao)
  _catalog?: Relation<CatalogDao>

  @Column({unique: true})
  id!: string
  @Column("simple-json", {nullable: true})
  endpointDescription?: Reference;
  @Column({nullable: true})
  endpointURL?: string;

  @ManyToMany(() => DatasetDao)
  @JoinTable()
  _servesDataset?: Array<DatasetDao>;
  get servesDataset(): Dataset<DatasetDto>[] | undefined {
    return mapToInstances(this._servesDataset, Dataset)
  }
}

@Entity({name: "distribution"})
export class DistributionDao extends MetaEntity implements IDistribution {
  @Column({unique: true})
  id!: string
  @ManyToMany(() => DataServiceDao)
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
export class DatasetDao extends ResourceDao implements IDataset {
  @Column({unique: true})
  id!: string
  @ManyToOne(() => CatalogDao)
  _catalog?: Relation<CatalogDao>
  @ManyToMany(() => DataServiceDao)
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
  @OneToOne(() => ResourceDao)
  @JoinColumn()
  _primaryTopic?: Resource;
  get primaryTopic(): Resource | undefined {
    return (this._primaryTopic) ? new Resource(this._primaryTopic) : undefined;
  }
}

@Entity({name: "catalog"})
export class CatalogDao extends DatasetDao implements ICatalog {
  @Column({unique: true})
  id!: string
  @OneToMany(() => DatasetDao, (dataset) => dataset._catalog)
  _dataset?: Array<DatasetDao>;
  get dataset(): Array<Dataset> | undefined {
    return mapToInstances(this._dataset, Dataset)
  }
  @Column("simple-json", {nullable: true})
  record?: CatalogRecord;
  @OneToMany(() => DataServiceDao, (dataservice) => dataservice._catalog)
  _service?: Array<DataService>;
  get service(): Array<DataService> | undefined {
    return mapToInstances(this._service, DataService)
  }
  themeTaxonomy?: Reference;
  @OneToMany(() => ResourceDao, (resource) => resource._catalog)
  _hasPart?: Array<ResourceDao>;
  get hasPart(): Array<Resource> | undefined {
    return mapToInstances(this._hasPart, Resource)
  }
  homepage?: Reference;
}














// @Entity()
// export class CatalogDao extends MetaEntity {
//   @PrimaryGeneratedColumn()
//   id!: number;

//   @OneToMany(() => DatasetDao, (dataset) => dataset.catalog)
//   dataset!: Array<DatasetDao>
//   @OneToMany(() => DataServiceDao, (service) => service.catalog)
//   service!: Array<DataServiceDao>
// }

// @Entity()
// export class DatasetDao extends MetaEntity {
//   @PrimaryGeneratedColumn()
//   id!: number;

//   @ManyToOne(() => CatalogDao, (catalog) => catalog.dataset)
//   catalog!: CatalogDao

//   @OneToMany(() => DistributionDao, (distribution) => distribution.dataset)
//   distribution!: Array<DistributionDao>
// }

// @Entity()
// export class DataServiceDao extends MetaEntity {
//   @PrimaryGeneratedColumn()
//   id!: number;

//   @ManyToOne(() => CatalogDao, (catalog) => catalog.dataset)
//   catalog!: CatalogDao
//   @ManyToOne(() => CatalogDao, (catalog) => catalog.dataset)
//   distribution!: CatalogDao
// }

// @Entity()
// export class DistributionDao extends MetaEntity {
//   @PrimaryGeneratedColumn()
//   id!: number;

//   @ManyToOne(() => DatasetDao, (dataset) => dataset.distribution)
//   dataset!: DatasetDao
// }