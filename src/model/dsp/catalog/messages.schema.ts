import { LDContext, LDMultilanguage } from "../common.schema";
import { LDCatalog } from "./catalog.schema";

export interface LDCatalogError extends LDContext {
  '@type': 'dspace:CatalogError'
  'dspace:code'?: string;
  'dspace:reason'?: Array<LDMultilanguage | string>;
}
export interface LDCatalogMessage extends LDContext {
  '@type': 'dspace:CatalogMessage'
  'dspace:catalog'?: Array<LDCatalog>;
}

export interface Filter {
  "@type": "dspace:Filter";
  [filterKey: string]: string;
}

export interface LDCatalogRequestMessage extends LDContext {
  '@type': 'dspace:CatalogRequestMessage'
  'dspace:filter'?: Array<Filter>;
}

export interface LDDatasetRequestMessage extends LDContext {
  '@type': 'dspace:DatasetRequestMessage'
  'dspace:dataset': string;
}