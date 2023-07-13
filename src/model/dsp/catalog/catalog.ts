import { IsDate, IsString, ValidateNested } from "class-validator";
import { Serializable, Namespace } from "../../decorators";
import {
  Decimal,
  Duration,
  IReference,
  Multilanguage,
  Reference,
  Time,
} from "../common";
import { Policy } from "../negotiation/negotiation";

export interface IResource extends IReference {
  contactPoint?: Reference;
  keyword?: Array<Multilanguage>;
  landingPage?: Reference;
  theme?: Array<Reference>;
  conformsTo?: Reference;
  creator?: Reference;
  description?: Array<Multilanguage>;
  identifier?: string;
  isReferencedBy?: Reference;
  issued?: Time;
  language?: Reference;
  license?: Reference;
  modified?: Time;
  publisher?: Reference;
  relation?: Reference;
  title?: string;
  type?: Reference;
  hasPolicy?: Array<Policy>;
}

@Serializable("dcat:Resource")
export class Resource extends Reference {
  @Namespace("dcat")
  @ValidateNested()
  contactPoint?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  keyword?: Array<Multilanguage>;
  @Namespace("dcat")
  @ValidateNested()
  landingPage?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  theme?: Array<Reference>;
  @Namespace("dcat")
  @ValidateNested()
  conformsTo?: Reference;
  @Namespace("dct")
  @ValidateNested()
  creator?: Reference;
  @Namespace("dct")
  @ValidateNested()
  description?: Array<Multilanguage>;
  @Namespace("dct")
  identifier?: string;
  @Namespace("dct")
  @ValidateNested()
  isReferencedBy?: Reference;
  @Namespace("dct")
  @ValidateNested()
  issued?: Time;
  @Namespace("dct")
  @ValidateNested()
  language?: Reference;
  @Namespace("dct")
  @ValidateNested()
  license?: Reference;
  @Namespace("dct")
  @ValidateNested()
  modified?: Time;
  @Namespace("dct")
  @ValidateNested()
  publisher?: Reference;
  @Namespace("dct")
  @ValidateNested()
  relation?: Reference;
  @Namespace("dct")
  title?: string;
  @Namespace("dct")
  @ValidateNested()
  type?: Reference;
  @Namespace("odrl")
  @ValidateNested()
  hasPolicy?: Array<Policy>;

  constructor (value: IResource) {
    super(value);
    this.contactPoint = value.contactPoint;
    this.keyword = value.keyword;
    this.landingPage = value.landingPage;
    this.theme = value.theme;
    this.conformsTo = value.conformsTo;
    this.creator = value.creator;
    this.description = value.description;
    this.identifier = value.identifier;
    this.isReferencedBy = value.isReferencedBy;
    this.issued = value.issued;
    this.language = value.language;
    this.license = value.license;
    this.modified = value.modified;
    this.publisher = value.publisher;
    this.relation = value.relation;
    this.title = value.title;
    this.type = value.type;
    this.hasPolicy = value.hasPolicy;
  }
}

export interface IDataService extends IResource {
  endpointDescription?: Reference;
  endpointURL?: string;
  servesDataset?: Array<Dataset>;
}

@Serializable("dcat:DataService")
export class DataService extends Resource {
  @Namespace("dcat")
  @ValidateNested()
  endpointDescription?: Reference;
  @Namespace("dcat")
  @IsString()
  endpointURL?: string;
  @Namespace("dcat")
  @ValidateNested()
  servesDataset?: Array<Dataset>;

  constructor (value: IDataService) {
    super(value);
    this.endpointDescription = value.endpointDescription;
    this.endpointURL = value.endpointURL;
    this.servesDataset = value.servesDataset;
  }
}

export interface IDistribution extends IReference {
  accessService?: Array<DataService>;
  accessURL?: Reference;
  byteSize?: Decimal;
  compressFormat?: Reference;
  downloadURL?: Reference;
  mediaType?: Reference;
  packageFormat?: Reference;
  spatialResolutionInMeters?: Decimal;
  temporalResolution?: Duration;
  conformsTo?: Reference;
  description?: Array<Multilanguage>;
  format?: Reference;
  issued?: Time;
  modified?: Time;
  title?: string;
  hasPolicy?: Array<Policy>;
}

@Serializable("dcat:Distribution")
export class Distribution extends Reference {
  @Namespace("dcat")
  @ValidateNested()
  accessService?: Array<DataService>;
  @Namespace("dcat")
  @ValidateNested()
  accessURL?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  byteSize?: Decimal;
  @Namespace("dcat")
  @ValidateNested()
  compressFormat?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  downloadURL?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  mediaType?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  packageFormat?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  spatialResolutionInMeters?: Decimal;
  @Namespace("dcat")
  @ValidateNested()
  temporalResolution?: Duration;
  @Namespace("dct")
  @ValidateNested()
  conformsTo?: Reference;
  @Namespace("dct")
  @ValidateNested()
  description?: Array<Multilanguage>;
  @Namespace("dct")
  @ValidateNested()
  format?: Reference;
  @Namespace("dct")
  @ValidateNested()
  issued?: Time;
  @Namespace("dct")
  @ValidateNested()
  modified?: Time;
  @Namespace("dct")
  @IsString()
  title?: string;
  @Namespace("odrl")
  @ValidateNested()
  hasPolicy?: Array<Policy>;

  constructor (value: IDistribution) {
    super(value);
    this.accessService = value.accessService;
    this.accessURL = value.accessURL;
    this.byteSize = value.byteSize;
    this.compressFormat = value.compressFormat;
    this.downloadURL = value.downloadURL;
    this.mediaType = value.mediaType;
    this.packageFormat = value.packageFormat;
    this.spatialResolutionInMeters = value.spatialResolutionInMeters;
    this.temporalResolution = value.temporalResolution;
    this.conformsTo = value.conformsTo;
    this.description = value.description;
    this.format = value.format;
    this.issued = value.issued;
    this.modified = value.modified;
    this.title = value.title;
    this.hasPolicy = value.hasPolicy;
  }
}

export interface IDataset extends IResource {
  distribution?: Array<Distribution>;
  spatialResolutionInMeters?: Reference;
  temporalResolution?: Duration;
  accrualPeriodicity?: Reference;
  spatial?: Reference;
  temporal?: Reference;
  wasGeneratedBy?: Reference;
}

@Serializable("dcat:Dataset")
export class Dataset extends Resource {
  @Namespace("dcat")
  @ValidateNested()
  distribution?: Array<Distribution>;
  @Namespace("dcat")
  @ValidateNested()
  spatialResolutionInMeters?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  temporalResolution?: Duration;
  @Namespace("dct")
  @ValidateNested()
  accrualPeriodicity?: Reference;
  @Namespace("dct")
  @ValidateNested()
  spatial?: Reference;
  @Namespace("dct")
  @ValidateNested()
  temporal?: Reference;
  @Namespace("prov")
  @ValidateNested()
  wasGeneratedBy?: Reference;

  constructor (value: IDataset) {
    super(value);
    this.distribution = value.distribution;
    this.spatialResolutionInMeters = value.spatialResolutionInMeters;
    this.temporalResolution = value.temporalResolution;
    this.accrualPeriodicity = value.accrualPeriodicity;
    this.spatial = value.spatial;
    this.temporal = value.temporal;
    this.wasGeneratedBy = value.wasGeneratedBy;
  }
}

export interface ICatalogRecord extends IReference {
  conformsTo?: Reference;
  description?: Array<Multilanguage>;
  issued?: Date;
  modified?: Date;
  title?: string;
  primaryTopic?: Resource;
}

@Serializable("dcat:CatalogRecord")
export class CatalogRecord extends Reference {
  @Namespace("dct")
  @ValidateNested()
  conformsTo?: Reference;
  @Namespace("dct")
  @ValidateNested()
  description?: Array<Multilanguage>;
  @Namespace("dct")
  @IsDate()
  issued?: Date;
  @Namespace("dct")
  @IsDate()
  modified?: Date;
  @Namespace("dct")
  @IsString()
  title?: string;
  @Namespace("foaf")
  @ValidateNested()
  primaryTopic?: Resource;

  constructor (value: ICatalogRecord) {
    super(value);
    this.conformsTo = value.conformsTo;
    this.description = value.description;
    this.issued = value.issued;
    this.modified = value.modified;
    this.title = value.title;
    this.primaryTopic = value.primaryTopic;
  }
}

export interface ICatalog extends IDataset {
  dataset?: Array<Dataset>;
  record?: CatalogRecord;
  service?: Array<DataService>;
  themeTaxonomy?: Reference;
  hasPart?: Array<Resource>;
  homepage?: Reference;
}

@Serializable("dcat:Catalog")
export class Catalog extends Dataset {
  @Namespace("dcat")
  @ValidateNested()
  dataset?: Array<Dataset>;
  @Namespace("dcat")
  @ValidateNested()
  record?: CatalogRecord;
  @Namespace("dcat")
  @ValidateNested()
  service?: Array<DataService>;
  @Namespace("dcat")
  @ValidateNested()
  themeTaxonomy?: Reference;
  @Namespace("dct")
  @ValidateNested()
  hasPart?: Array<Resource>;
  @Namespace("foaf")
  @ValidateNested()
  homepage?: Reference;

  constructor (value: ICatalog) {
    super(value);
    this.dataset = value.dataset;
    this.record = value.record;
    this.service = value.service;
    this.themeTaxonomy = value.themeTaxonomy;
    this.hasPart = value.hasPart;
    this.homepage = value.homepage;
  }
}
