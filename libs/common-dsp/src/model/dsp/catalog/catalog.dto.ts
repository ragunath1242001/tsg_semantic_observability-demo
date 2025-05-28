import { ContextDto, ReferenceDto } from "../common.dto.js";
import { PolicyDto } from "../negotiation/negotiation.dto.js";

export interface ResourceDto extends ContextDto, ReferenceDto {
  "@type": "Resource";
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
  hasPolicy?: Array<PolicyDto>;
  hasVersion?: Array<string>;
  isVersionOf?: string;
  version?: string;
  hasCurrentVersion?: string;
  previousVersion?: string;
}

export interface DataServiceDto extends Omit<ResourceDto, "@type"> {
  "@type": "DataService";
  endpointDescription?: string;
  endpointURL?: string;
  servesDataset?: Array<DatasetDto>;
}

export interface DistributionDto extends ReferenceDto {
  "@type": "Distribution";
  accessService?: DataServiceDto | string;
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
  hasPolicy?: Array<PolicyDto>;
}

export interface DatasetDto extends Omit<ResourceDto, "@type"> {
  "@type": "Dataset";
  distribution?: Array<DistributionDto>;
  spatialResolutionInMeters?: string;
  temporalResolution?: string;
  accrualPeriodicity?: string;
  spatial?: string;
  temporal?: string;
  wasGeneratedBy?: any;
  "healthdcatap:hasCodingSystem"?: string[];
  "healthdcatap:numberOfRecords"?: number;
  "healthdcatap:numberOfUniqueIndividuals"?: number;
  "healthdcatap:healthTheme"?: string[];
  "adms:sample"?: DistributionDto;
}

export interface CatalogRecordDto extends ReferenceDto {
  "@type": "CatalogRecord";
  conformsTo?: string[];
  description?: Array<string>;
  issued?: Date;
  modified?: Date;
  title?: string;
  primaryTopic?: ResourceDto;
}

export interface CatalogDto extends Omit<DatasetDto, "@type"> {
  "@type": "Catalog";
  participantId: string;
  dataset?: Array<DatasetDto>;
  record?: CatalogRecordDto;
  service?: Array<DataServiceDto>;
  themeTaxonomy?: string;
  hasPart?: Array<ResourceDto>;
  homepage?: string;
}
