import { LDContext, LDMultilanguage, LDReference } from "../common.schema";
import { LDPolicy } from "../negotiation/negotiation.schema";

export interface LDResource extends LDContext, LDReference {
  '@type': 'dcat:Resource'
  'dcat:contactPoint'?: LDReference;
  'dcat:keyword'?: Array<LDMultilanguage | string>;
  'dcat:landingPage'?: LDReference;
  'dcat:theme'?: Array<LDReference>;
  'dcat:conformsTo'?: LDReference;
  'dct:creator'?: LDReference;
  'dct:description'?: Array<LDMultilanguage | string>;
  'dct:identifier'?: string;
  'dct:isReferencedBy'?: LDReference;
  'dct:issued'?: string;
  'dct:language'?: LDReference;
  'dct:license'?: LDReference;
  'dct:modified'?: string;
  'dct:publisher'?: LDReference;
  'dct:relation'?: LDReference;
  'dct:title'?: string;
  'dct:type'?: LDReference;
  'odrl:hasPolicy'?: Array<LDPolicy>;
}

export interface LDDataService extends Omit<LDResource, '@type'> {
  '@type': 'dcat:DataService'
  'dcat:endpointDescription'?: LDReference;
  'dcat:endpointURL'?: string;
  'dcat:servesDataset'?: Array<LDDataset>;
}

export interface LDDistribution extends LDReference {
  '@type': 'dcat:Distribution'
  'dcat:accessService'?: Array<LDDataService>;
  'dcat:accessURL'?: LDReference;
  'dcat:byteSize'?: string;
  'dcat:compressFormat'?: LDReference;
  'dcat:downloadURL'?: LDReference;
  'dcat:mediaType'?: LDReference;
  'dcat:packageFormat'?: LDReference;
  'dcat:spatialResolutionInMeters'?: string;
  'dcat:temporalResolution'?: string;
  'dct:conformsTo'?: LDReference;
  'dct:description'?: Array<LDMultilanguage | string>;
  'dct:format'?: LDReference;
  'dct:issued'?: string;
  'dct:modified'?: string;
  'dct:title'?: string;
  'dcat:hasPolicy'?: Array<LDPolicy>;
}

export interface LDDataset extends Omit<LDResource, '@type'> {
  '@type': 'dcat:Dataset'
  'dcat:distribution'?: Array<LDDistribution>;
  'dcat:spatialResolutionInMeters'?: LDReference;
  'dcat:temporalResolution'?: string;
  'dct:accrualPeriodicity'?: LDReference;
  'dct:spatial'?: LDReference;
  'dct:temporal'?: LDReference;
  'prov:wasGeneratedBy'?: LDReference;
}

export interface LDCatalogRecord extends LDReference {
  '@type': 'dcat:CatalogRecord'
  'dct:conformsTo'?: LDReference;
  'dct:description'?: Array<LDMultilanguage | string>;
  'dct:issued'?: Date;
  'dct:modified'?: Date;
  'dct:title'?: string;
  'foaf:primaryTopic'?: LDResource;
}

export interface LDCatalog extends Omit<LDDataset, '@type'> {
  '@type': 'dcat:Catalog'
  'dcat:dataset'?: Array<LDDataset>;
  'dcat:record'?: LDCatalogRecord;
  'dcat:service'?: Array<LDDataService>;
  'dcat:themeTaxonomy'?: LDReference;
  'dct:hasPart'?: Array<LDResource>;
  'foaf:homepage'?: LDReference;
}
