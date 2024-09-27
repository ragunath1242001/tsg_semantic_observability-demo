import { ContextDto, ReferenceDto } from "../common.dto";
import { PolicyDto } from "../negotiation/negotiation.dto";

export interface ResourceDto extends ContextDto, ReferenceDto {
  "@type": "dcat:Resource";
  "dcat:contactPoint"?: ReferenceDto;
  "dcat:keyword"?: Array<string>;
  "dcat:landingPage"?: ReferenceDto;
  "dcat:theme"?: Array<ReferenceDto>;
  "dct:conformsTo"?: string[];
  "dct:creator"?: string;
  "dct:description"?: Array<string>;
  "dct:identifier"?: string;
  "dct:isReferencedBy"?: ReferenceDto;
  "dct:issued"?: string;
  "dct:language"?: ReferenceDto;
  "dct:license"?: ReferenceDto;
  "dct:modified"?: string;
  "dct:publisher"?: string;
  "dct:relation"?: ReferenceDto;
  "dct:title"?: string;
  "dct:type"?: string;
  "odrl:hasPolicy"?: Array<PolicyDto>;
  "dcat:hasVersion"?: Array<ReferenceDto>;
  "dcat:isVersionOf"?: ReferenceDto;
  "dcat:version"?: string;
  "dcat:hasCurrentVersion"?: ReferenceDto;
  "dcat:previousVersion"?: ReferenceDto;
}

export interface DataServiceDto extends Omit<ResourceDto, "@type"> {
  "@type": "dcat:DataService";
  "dcat:endpointDescription"?: string;
  "dcat:endpointURL"?: string;
  "dcat:servesDataset"?: Array<DatasetDto>;
}

export interface DistributionDto extends ReferenceDto {
  "@type": "dcat:Distribution";
  "dcat:accessService"?: Array<DataServiceDto>;
  "dcat:accessURL"?: string;
  "dcat:byteSize"?: string;
  "dcat:compressFormat"?: string;
  "dcat:downloadURL"?: string;
  "dcat:mediaType"?: string;
  "dcat:packageFormat"?: string;
  "dcat:spatialResolutionInMeters"?: string;
  "dcat:temporalResolution"?: string;
  "dct:conformsTo"?: string[];
  "dct:description"?: Array<string>;
  "dct:format"?: string;
  "dct:issued"?: string;
  "dct:modified"?: string;
  "dct:title"?: string;
  "dcat:hasPolicy"?: Array<PolicyDto>;
}

export interface DatasetDto extends Omit<ResourceDto, "@type"> {
  "@type": "dcat:Dataset";
  "dcat:distribution"?: Array<DistributionDto>;
  "dcat:spatialResolutionInMeters"?: ReferenceDto;
  "dcat:temporalResolution"?: string;
  "dct:accrualPeriodicity"?: ReferenceDto;
  "dct:spatial"?: ReferenceDto;
  "dct:temporal"?: ReferenceDto;
  "prov:wasGeneratedBy"?: any;
  "healthdcatap:hasCodingSystem"?: string[];
  "healthdcatap:numberOfRecords"?: number;
  "healthdcatap:numberOfUniqueIndividuals"?: number;
  "healthdcatap:healthTheme"?: string[];
  "adms:sample"?: DistributionDto;
}

export interface CatalogRecordDto extends ReferenceDto {
  "@type": "dcat:CatalogRecord";
  "dct:conformsTo"?: string[];
  "dct:description"?: Array<string>;
  "dct:issued"?: Date;
  "dct:modified"?: Date;
  "dct:title"?: string;
  "foaf:primaryTopic"?: ResourceDto;
}

export interface CatalogDto extends Omit<DatasetDto, "@type"> {
  "@type": "dcat:Catalog";
  "dcat:dataset"?: Array<DatasetDto>;
  "dcat:record"?: CatalogRecordDto;
  "dcat:service"?: Array<DataServiceDto>;
  "dcat:themeTaxonomy"?: ReferenceDto;
  "dct:hasPart"?: Array<ResourceDto>;
  "foaf:homepage"?: string;
}
