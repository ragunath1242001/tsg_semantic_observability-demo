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
  contactPoint?: Reference;
  @Namespace("dcat")
  keyword?: Array<Multilanguage>;
  @Namespace("dcat")
  landingPage?: Reference;
  @Namespace("dcat")
  theme?: Array<Reference>;
  @Namespace("dcat")
  conformsTo?: Reference;
  @Namespace("dct")
  creator?: Reference;
  @Namespace("dct")
  description?: Array<Multilanguage>;
  @Namespace("dct")
  identifier?: string;
  @Namespace("dct")
  isReferencedBy?: Reference;
  @Namespace("dct")
  issued?: Time;
  @Namespace("dct")
  language?: Reference;
  @Namespace("dct")
  license?: Reference;
  @Namespace("dct")
  modified?: Time;
  @Namespace("dct")
  publisher?: Reference;
  @Namespace("dct")
  relation?: Reference;
  @Namespace("dct")
  title?: string;
  @Namespace("dct")
  type?: Reference;
  @Namespace("odrl")
  hasPolicy?: Array<Policy>;

  constructor(value: IResource) {
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
  endpointDescription?: Reference;
  @Namespace("dcat")
  endpointURL?: string;
  @Namespace("dcat")
  servesDataset?: Array<Dataset>;

  constructor(value: IDataService) {
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
  title?: String;
  hasPolicy?: Array<Policy>;
}

@Serializable("dcat:Distribution")
export class Distribution extends Reference {
  @Namespace("dcat")
  accessService?: Array<DataService>;
  @Namespace("dcat")
  accessURL?: Reference;
  @Namespace("dcat")
  byteSize?: Decimal;
  @Namespace("dcat")
  compressFormat?: Reference;
  @Namespace("dcat")
  downloadURL?: Reference;
  @Namespace("dcat")
  mediaType?: Reference;
  @Namespace("dcat")
  packageFormat?: Reference;
  @Namespace("dcat")
  spatialResolutionInMeters?: Decimal;
  @Namespace("dcat")
  temporalResolution?: Duration;
  @Namespace("dct")
  conformsTo?: Reference;
  @Namespace("dct")
  description?: Array<Multilanguage>;
  @Namespace("dct")
  format?: Reference;
  @Namespace("dct")
  issued?: Time;
  @Namespace("dct")
  modified?: Time;
  @Namespace("dct")
  title?: String;
  @Namespace("odrl")
  hasPolicy?: Array<Policy>;

  constructor(value: IDistribution) {
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
  distribution?: Array<Distribution>;
  @Namespace("dcat")
  spatialResolutionInMeters?: Reference;
  @Namespace("dcat")
  temporalResolution?: Duration;
  @Namespace("dct")
  accrualPeriodicity?: Reference;
  @Namespace("dct")
  spatial?: Reference;
  @Namespace("dct")
  temporal?: Reference;
  @Namespace("prov")
  wasGeneratedBy?: Reference;

  constructor(value: IDataset) {
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
  title?: String;
  primaryTopic?: Resource;
}

@Serializable("dcat:CatalogRecord")
export class CatalogRecord extends Reference {
  @Namespace("dct")
  conformsTo?: Reference;
  @Namespace("dct")
  description?: Array<Multilanguage>;
  @Namespace("dct")
  issued?: Date;
  @Namespace("dct")
  modified?: Date;
  @Namespace("dct")
  title?: String;
  @Namespace("foaf")
  primaryTopic?: Resource;

  constructor(value: ICatalogRecord) {
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
  dataset?: Array<Dataset>;
  @Namespace("dcat")
  record?: CatalogRecord;
  @Namespace("dcat")
  service?: Array<DataService>;
  @Namespace("dcat")
  themeTaxonomy?: Reference;
  @Namespace("dct")
  hasPart?: Array<Resource>;
  @Namespace("foaf")
  homepage?: Reference;

  constructor(value: ICatalog) {
    super(value);
    this.dataset = value.dataset;
    this.record = value.record;
    this.service = value.service;
    this.themeTaxonomy = value.themeTaxonomy;
    this.hasPart = value.hasPart;
    this.homepage = value.homepage;
  }
}
