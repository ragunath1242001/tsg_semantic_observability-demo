import { ContextDto, MultilanguageDto } from "../common.dto";
import { CatalogDto } from "./catalog.dto";

export interface CatalogErrorDto extends ContextDto {
  '@type': 'dspace:CatalogError'
  'dspace:code'?: string;
  'dspace:reason'?: Array<MultilanguageDto | string>;
}
export interface CatalogMessageDto extends ContextDto {
  '@type': 'dspace:CatalogMessage'
  'dspace:catalog'?: Array<CatalogDto>;
}

export interface Filter {
  "@type": "dspace:Filter";
  [filterKey: string]: string;
}

export interface CatalogRequestMessageDto extends ContextDto {
  '@type': 'dspace:CatalogRequestMessage'
  'dspace:filter'?: Array<Filter>;
}

export interface DatasetRequestMessageDto extends ContextDto {
  '@type': 'dspace:DatasetRequestMessage'
  'dspace:dataset': string;
}