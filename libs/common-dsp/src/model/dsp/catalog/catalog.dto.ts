import { ContextDto, ReferenceDto } from "../common.dto";
import { PolicyDto } from "../negotiation/negotiation.dto";

export interface ResourceDto extends ContextDto, ReferenceDto {
  "@type": "dcat:Resource";
  "dcat:contactPoint"?: string;
  "dcat:keyword"?: Array<string>;
  "dcat:landingPage"?: string;
  "dcat:theme"?: Array<string>;
  "dct:conformsTo"?: string[];
  "dct:creator"?: string;
  "dct:description"?: Array<string>;
  "dct:identifier"?: string;
  "dct:isReferencedBy"?: string;
  "dct:issued"?: string;
  "dct:language"?: string;
  "dct:license"?: string;
  "dct:modified"?: string;
  "dct:publisher"?: string;
  "dct:relation"?: string;
  "dct:title"?: string;
  "dct:type"?: string;
  "odrl:hasPolicy"?: Array<PolicyDto>;
  "dcat:hasVersion"?: Array<string>;
  "dcat:isVersionOf"?: string;
  "dcat:version"?: string;
  "dcat:hasCurrentVersion"?: string;
  "dcat:previousVersion"?: string;
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
  "dcat:spatialResolutionInMeters"?: string;
  "dcat:temporalResolution"?: string;
  "dct:accrualPeriodicity"?: string;
  "dct:spatial"?: string;
  "dct:temporal"?: string;
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
  "dcat:themeTaxonomy"?: string;
  "dct:hasPart"?: Array<ResourceDto>;
  "foaf:homepage"?: string;
}
