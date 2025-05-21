import { ContextDto } from "../common.dto.js";

export interface CatalogErrorDto extends ContextDto {
  "@type": "CatalogError";
  code?: string;
  reason?: Array<any>;
}

export interface Filter {
  "@type": "Filter";
  [filterKey: string]: string;
}

export interface CatalogRequestMessageDto extends ContextDto {
  "@type": "CatalogRequestMessage";
  filter?: Array<Filter>;
}

export interface DatasetRequestMessageDto extends ContextDto {
  "@type": "DatasetRequestMessage";
  dataset: string;
}
