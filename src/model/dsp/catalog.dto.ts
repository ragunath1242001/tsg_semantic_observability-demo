import { ContextDto, MultilanguageDto, ReferenceDto } from "./common.dto";
import { PolicyDto } from "./negotiation.dto";

export interface ResourceDto extends ContextDto, ReferenceDto {
  '@type': 'dcat:Resource'
  'dcat:contactPoint'?: ReferenceDto;
  'dcat:keyword'?: Array<MultilanguageDto | string>;
  'dcat:landingPage'?: ReferenceDto;
  'dcat:theme'?: Array<ReferenceDto>;
  'dcat:conformsTo'?: ReferenceDto;
  'dct:creator'?: ReferenceDto;
  'dct:description'?: Array<MultilanguageDto | string>;
  'dct:identifier'?: string;
  'dct:isReferencedBy'?: ReferenceDto;
  'dct:issued'?: string;
  'dct:language'?: ReferenceDto;
  'dct:license'?: ReferenceDto;
  'dct:modified'?: string;
  'dct:publisher'?: string;
  'dct:relation'?: ReferenceDto;
  'dct:title'?: string;
  'dct:type'?: string;
  'odrl:hasPolicy'?: Array<PolicyDto>;
}

export interface DataServiceDto extends Omit<ResourceDto, '@type'> {
  '@type': 'dcat:DataService'
  'dcat:endpointDescription'?: ReferenceDto;
  'dcat:endpointURL'?: string;
  'dcat:servesDataset'?: Array<DatasetDto>;
}

export interface DistributionDto extends ReferenceDto {
  '@type': 'dcat:Distribution'
  'dcat:accessService'?: Array<DataServiceDto>;
  'dcat:accessURL'?: ReferenceDto;
  'dcat:byteSize'?: string;
  'dcat:compressFormat'?: ReferenceDto;
  'dcat:downloadURL'?: ReferenceDto;
  'dcat:mediaType'?: ReferenceDto;
  'dcat:packageFormat'?: ReferenceDto;
  'dcat:spatialResolutionInMeters'?: string;
  'dcat:temporalResolution'?: string;
  'dct:conformsTo'?: ReferenceDto;
  'dct:description'?: Array<MultilanguageDto | string>;
  'dct:format'?: string;
  'dct:issued'?: string;
  'dct:modified'?: string;
  'dct:title'?: string;
  'dcat:hasPolicy'?: Array<PolicyDto>;
}

export interface DatasetDto extends Omit<ResourceDto, '@type'> {
  '@type': 'dcat:Dataset'
  'dcat:distribution'?: Array<DistributionDto>;
  'dcat:spatialResolutionInMeters'?: ReferenceDto;
  'dcat:temporalResolution'?: string;
  'dct:accrualPeriodicity'?: ReferenceDto;
  'dct:spatial'?: ReferenceDto;
  'dct:temporal'?: ReferenceDto;
  'prov:wasGeneratedBy'?: ReferenceDto;
}

export interface CatalogRecordDto extends ReferenceDto {
  '@type': 'dcat:CatalogRecord'
  'dct:conformsTo'?: ReferenceDto;
  'dct:description'?: Array<MultilanguageDto | string>;
  'dct:issued'?: Date;
  'dct:modified'?: Date;
  'dct:title'?: string;
  'foaf:primaryTopic'?: ResourceDto;
}

export interface CatalogDto extends Omit<DatasetDto, '@type'> {
  '@type': 'dcat:Catalog'
  'dcat:dataset'?: Array<DatasetDto>;
  'dcat:record'?: CatalogRecordDto;
  'dcat:service'?: Array<DataServiceDto>;
  'dcat:themeTaxonomy'?: ReferenceDto;
  'dct:hasPart'?: Array<ResourceDto>;
  'foaf:homepage'?: ReferenceDto;
}
