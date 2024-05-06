import { IsDate, IsOptional, IsString, ValidateNested } from "class-validator";
import {
  createOptionalInstance,
  createOptionalInstances,
} from "../../../utils/instances";
import { Namespace, Serializable } from "../../decorators";
import {
  Decimal,
  Duration,
  IReference,
  Multilanguage,
  Reference,
  Time,
} from "../common";
import { ContextDto } from "../common.dto";
import { Offer, Policy } from "../negotiation/negotiation";
import { CatalogDto, CatalogRecordDto, DataServiceDto, DatasetDto, DistributionDto, ResourceDto } from "./catalog.dto";

export interface IResource extends IReference {
  contactPoint?: Reference;
  keyword?: Array<string>;
  landingPage?: Reference;
  theme?: Array<Reference>;
  conformsTo?: string;
  creator?: string;
  description?: Array<Multilanguage>;
  identifier?: string;
  isReferencedBy?: Reference;
  issued?: Time;
  language?: Reference;
  license?: Reference;
  modified?: Time;
  publisher?: string;
  relation?: Reference;
  title?: string;
  type?: string;
  hasPolicy?: Array<Policy>;
  hasVersion?: Array<Reference>;
  isVersionOf?: Reference;
  version?: string;
  hasCurrentVersion?: Reference;
  previousVersion?: Reference;
}

@Serializable("dcat:Resource")
export class Resource<
  OutType extends ContextDto = ResourceDto
> extends Reference<OutType> {
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  contactPoint?: Reference;
  @Namespace("dcat")
  @IsOptional()
  keyword?: Array<string>;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  landingPage?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  theme?: Array<Reference>;
  @Namespace("dcat")
  @IsOptional()
  conformsTo?: string;
  @Namespace("dct")
  @IsOptional()
  creator?: string;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  description?: Array<Multilanguage>;
  @Namespace("dct")
  identifier?: string;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  isReferencedBy?: Reference;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  issued?: Time;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  language?: Reference;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  license?: Reference;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  modified?: Time;
  @Namespace("dct")
  publisher?: string;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  relation?: Reference;
  @Namespace("dct")
  title?: string;
  @Namespace("dct")
  type?: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  hasPolicy?: Array<Policy>;
  @Namespace("dcat")
  @IsOptional()
  hasVersion?: Array<Reference>;
  @Namespace("dcat")
  @IsOptional()
  isVersionOf?: Reference;
  @Namespace("dcat")
  @IsOptional()
  version?: string;
  @Namespace("dcat")
  @IsOptional()
  hasCurrentVersion?: Reference;
  @Namespace("dcat")
  @IsOptional()
  previousVersion?: Reference;

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
    this.hasPolicy = createOptionalInstances(value.hasPolicy, Offer);
    this.hasVersion = createOptionalInstances(value.hasVersion, Reference);
    this.isVersionOf = value.isVersionOf;
    this.version = value.version;
    this.hasCurrentVersion = value.hasCurrentVersion;
    this.previousVersion = value.previousVersion;
  }
}

export interface IDataService extends IResource {
  endpointDescription?: string;
  endpointURL?: string;
  servesDataset?: Array<Dataset>;
}

@Serializable("dcat:DataService")
export class DataService extends Resource<DataServiceDto> {
  @Namespace("dcat")
  @IsOptional()
  endpointDescription?: string;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  endpointURL?: string;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  servesDataset?: Array<Dataset>;

  constructor(value: IDataService) {
    super(value);
    this.endpointDescription = value.endpointDescription;
    this.endpointURL = value.endpointURL;
    this.servesDataset = createOptionalInstances(value.servesDataset, Dataset);
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
  format?: string;
  issued?: Time;
  modified?: Time;
  title?: string;
  hasPolicy?: Array<Policy>;
}

@Serializable("dcat:Distribution")
export class Distribution extends Reference<DistributionDto & ContextDto> {
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  accessService?: Array<DataService>;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  accessURL?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  byteSize?: Decimal;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  compressFormat?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  downloadURL?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  mediaType?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  packageFormat?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  spatialResolutionInMeters?: Decimal;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  temporalResolution?: Duration;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  conformsTo?: Reference;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  description?: Array<Multilanguage>;
  @Namespace("dct")
  @IsOptional()
  format?: string;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  issued?: Time;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  modified?: Time;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  title?: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  hasPolicy?: Array<Policy>;

  constructor(value: IDistribution) {
    super(value);
    this.accessService = createOptionalInstances(
      value.accessService,
      DataService
    );
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
    this.hasPolicy = createOptionalInstances(value.hasPolicy, Offer);
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
export class Dataset<
  OutType extends ContextDto = DatasetDto
> extends Resource<OutType> {
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  distribution?: Array<Distribution>;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  spatialResolutionInMeters?: Reference;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  temporalResolution?: Duration;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  accrualPeriodicity?: Reference;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  spatial?: Reference;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  temporal?: Reference;
  @Namespace("prov")
  @ValidateNested()
  @IsOptional()
  wasGeneratedBy?: Reference;

  constructor(value: IDataset) {
    super(value);
    this.distribution = createOptionalInstances(
      value.distribution,
      Distribution
    );
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
export class CatalogRecord extends Reference<CatalogRecordDto & ContextDto> {
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  conformsTo?: Reference;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  description?: Array<Multilanguage>;
  @Namespace("dct")
  @IsDate()
  @IsOptional()
  issued?: Date;
  @Namespace("dct")
  @IsDate()
  @IsOptional()
  modified?: Date;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  title?: string;
  @Namespace("foaf")
  @ValidateNested()
  @IsOptional()
  primaryTopic?: Resource;

  constructor(value: ICatalogRecord) {
    super(value);
    this.conformsTo = value.conformsTo;
    this.description = value.description;
    this.issued = value.issued;
    this.modified = value.modified;
    this.title = value.title;
    this.primaryTopic = createOptionalInstance(value.primaryTopic, Resource);
  }
}

export interface ICatalog extends IDataset {
  dataset?: Array<Dataset>;
  record?: Array<CatalogRecord>;
  service?: Array<DataService>;
  themeTaxonomy?: Reference;
  hasPart?: Array<Resource>;
  homepage?: string;
}

@Serializable("dcat:Catalog")
export class Catalog extends Dataset<CatalogDto> {
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  dataset?: Array<Dataset>;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  record?: Array<CatalogRecord>;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  service?: Array<DataService>;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  themeTaxonomy?: Reference;
  @Namespace("dct")
  @ValidateNested()
  @IsOptional()
  hasPart?: Array<Resource>;
  @Namespace("foaf")
  @ValidateNested()
  @IsOptional()
  homepage?: string;

  constructor(value: ICatalog) {
    super(value);
    this.dataset = createOptionalInstances(value.dataset, Dataset);
    this.record = createOptionalInstances(value.record, CatalogRecord);
    this.service = createOptionalInstances(value.service, DataService);
    this.themeTaxonomy = value.themeTaxonomy;
    this.hasPart = createOptionalInstances(value.hasPart, Resource);
    this.homepage = value.homepage;
  }
}
