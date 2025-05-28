import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import {
  createOptionalInstance,
  createOptionalInstances
} from "../../../utils/instances.js";
import {
  KeepTypes,
  LDType,
  Namespace,
  Serializable
} from "../../decorators.js";
import { ContextDto } from "../common.dto.js";
import { IReference, Reference, withExtraProps } from "../common.js";
import { Offer, Policy } from "../negotiation/negotiation.js";
import {
  CatalogDto,
  CatalogRecordDto,
  DataServiceDto,
  DatasetDto,
  DistributionDto,
  ResourceDto
} from "./catalog.dto.js";

export interface IResource extends IReference {
  contactPoint?: string;
  keyword?: Array<string>;
  landingPage?: string;
  theme?: Array<string>;
  conformsTo?: string[];
  creator?: string;
  description?: Array<string>;
  identifier?: string;
  isReferencedBy?: string;
  issued?: string;
  language?: string;
  license?: string;
  modified?: string;
  publisher?: string;
  relation?: string;
  title?: string;
  type?: string;
  hasPolicy?: Array<Policy>;
  hasVersion?: Array<string>;
  isVersionOf?: string;
  version?: string;
  hasCurrentVersion?: string;
  previousVersion?: string;
}

@Serializable("Resource")
export class Resource<
  OutType extends ContextDto = ResourceDto
> extends Reference<OutType> {
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  contactPoint?: string;
  @Namespace("dcat")
  @IsOptional()
  keyword?: Array<string>;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  landingPage?: string;
  @Namespace("dcat")
  @IsString({ each: true })
  @IsOptional()
  theme?: Array<string>;
  @Namespace("dct")
  @IsString({ each: true })
  @IsOptional()
  conformsTo?: string[];
  @Namespace("dct")
  @IsOptional()
  creator?: string;
  @Namespace("dct")
  @IsString({ each: true })
  @IsOptional()
  description?: Array<string>;
  @Namespace("dct")
  identifier?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  isReferencedBy?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  issued?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  language?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  license?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  modified?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  publisher?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  relation?: string;
  @Namespace("dct")
  title?: string;
  @Namespace("dct")
  type?: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  @LDType(() => Offer)
  hasPolicy?: Array<Policy>;
  @Namespace("dcat")
  @IsOptional()
  hasVersion?: Array<string>;
  @Namespace("dcat")
  @IsOptional()
  isVersionOf?: string;
  @Namespace("dcat")
  @IsOptional()
  version?: string;
  @Namespace("dcat")
  @IsOptional()
  hasCurrentVersion?: string;
  @Namespace("dcat")
  @IsOptional()
  previousVersion?: string;

  constructor(value: withExtraProps<IResource>) {
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
    this.hasVersion = value.hasVersion;
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

@Serializable("DataService")
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
  @LDType(() => Dataset)
  servesDataset?: Array<Dataset>;

  constructor(value: withExtraProps<IDataService>) {
    super(value);
    this.endpointDescription = value.endpointDescription;
    this.endpointURL = value.endpointURL;
    this.servesDataset = createOptionalInstances(value.servesDataset, Dataset);
  }
}

export interface IDistribution extends IReference {
  accessService?: DataService | string;
  accessURL?: string;
  byteSize?: string;
  compressFormat?: string;
  downloadURL?: string;
  mediaType?: string;
  packageFormat?: string;
  spatialResolutionInMeters?: string;
  temporalResolution?: string;
  conformsTo?: string[];
  description?: Array<string>;
  format?: string;
  issued?: string;
  modified?: string;
  title?: string;
  hasPolicy?: Array<Policy>;
}

@Serializable("Distribution")
export class Distribution extends Reference<DistributionDto & ContextDto> {
  @Namespace("dcat")
  @IsOptional()
  @LDType(() => DataService)
  accessService?: DataService | string;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  accessURL?: string;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  byteSize?: string;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  compressFormat?: string;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  downloadURL?: string;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  mediaType?: string;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  packageFormat?: string;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  spatialResolutionInMeters?: string;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  temporalResolution?: string;
  @Namespace("dct")
  @IsString({ each: true })
  @IsOptional()
  conformsTo?: string[];
  @Namespace("dct")
  @IsString({ each: true })
  @IsOptional()
  description?: Array<string>;
  @Namespace("dct")
  @IsOptional()
  format?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  issued?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  modified?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  title?: string;
  @Namespace("odrl")
  @ValidateNested()
  @IsOptional()
  @LDType(() => Offer)
  hasPolicy?: Array<Policy>;

  constructor(value: withExtraProps<IDistribution>) {
    super(value);
    this.accessService =
      typeof value.accessService === "string"
        ? value.accessService
        : createOptionalInstance(value.accessService, DataService);
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
  spatialResolutionInMeters?: string;
  temporalResolution?: string;
  accrualPeriodicity?: string;
  spatial?: string;
  temporal?: string;
  wasGeneratedBy?: any;
  hasCodingSystem?: string[];
  numberOfRecords?: number;
  numberOfUniqueIndividuals?: number;
  healthTheme?: string[];
  sample?: Distribution;
}

@Serializable("Dataset")
export class Dataset<
  OutType extends ContextDto = DatasetDto
> extends Resource<OutType> {
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  @LDType(() => Distribution)
  distribution?: Array<Distribution>;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  spatialResolutionInMeters?: string;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  temporalResolution?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  accrualPeriodicity?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  spatial?: string;
  @Namespace("dct")
  @IsString()
  @IsOptional()
  temporal?: string;
  @Namespace("prov")
  @IsOptional()
  wasGeneratedBy?: any;
  @Namespace("healthdcatap")
  @IsString({ each: true })
  @IsOptional()
  hasCodingSystem?: string[];
  @Namespace("healthdcatap")
  @IsNumber()
  @IsOptional()
  numberOfRecords?: number;
  @Namespace("healthdcatap")
  @IsNumber()
  @IsOptional()
  numberOfUniqueIndividuals?: number;
  @Namespace("healthdcatap")
  @IsString({ each: true })
  @IsOptional()
  healthTheme?: string[];
  @Namespace("adms")
  @IsOptional()
  @LDType(() => Distribution)
  sample?: Distribution;

  constructor(value: withExtraProps<IDataset>) {
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
    this.hasCodingSystem = value.hasCodingSystem;
    this.numberOfRecords = value.numberOfRecords;
    this.numberOfUniqueIndividuals = value.numberOfUniqueIndividuals;
    this.healthTheme = value.healthTheme;
    this.sample = createOptionalInstance(value.sample, Distribution);
  }
}

export interface ICatalogRecord extends IReference {
  conformsTo?: string[];
  description?: Array<string>;
  issued?: Date;
  modified?: Date;
  title?: string;
  primaryTopic?: Resource;
}

@Serializable("CatalogRecord")
export class CatalogRecord extends Reference<CatalogRecordDto & ContextDto> {
  @Namespace("dct")
  @IsString({ each: true })
  @IsOptional()
  conformsTo?: string[];
  @Namespace("dct")
  @IsString({ each: true })
  @IsOptional()
  description?: Array<string>;
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
  @KeepTypes()
  @IsOptional()
  primaryTopic?: Resource;

  constructor(value: withExtraProps<ICatalogRecord>) {
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
  participantId: string;
  dataset?: Array<Dataset>;
  record?: Array<CatalogRecord>;
  service?: Array<DataService>;
  themeTaxonomy?: string;
  hasPart?: Array<Resource>;
  homepage?: string;
}

@Serializable("Catalog")
export class Catalog extends Dataset<CatalogDto> {
  @Namespace("dspace")
  @IsString()
  participantId: string;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  @LDType(() => Dataset)
  dataset?: Array<Dataset>;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  @LDType(() => CatalogRecord)
  record?: Array<CatalogRecord>;
  @Namespace("dcat")
  @ValidateNested()
  @IsOptional()
  @LDType(() => DataService)
  service?: Array<DataService>;
  @Namespace("dcat")
  @IsString()
  @IsOptional()
  themeTaxonomy?: string;
  @Namespace("dct")
  @ValidateNested()
  @KeepTypes()
  @IsOptional()
  hasPart?: Array<Resource>;
  @Namespace("foaf")
  @ValidateNested()
  @IsOptional()
  homepage?: string;

  constructor(value: withExtraProps<ICatalog>) {
    super(value);
    this.participantId = value.participantId;
    this.dataset = createOptionalInstances(value.dataset, Dataset);
    this.record = createOptionalInstances(value.record, CatalogRecord);
    this.service = createOptionalInstances(value.service, DataService);
    this.themeTaxonomy = value.themeTaxonomy;
    this.hasPart = createOptionalInstances(value.hasPart, Resource);
    this.homepage = value.homepage;
  }
}
