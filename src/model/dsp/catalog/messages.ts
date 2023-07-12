import { Namespace, Serializable } from "../../decorators";
import { Multilanguage, SerializableClass } from "../common";
import { Catalog } from "./catalog";

export interface ICatalogError {
  code?: string;
  reason?: Array<Multilanguage>;
}

@Serializable("dspace:CatalogError")
export class CatalogError extends SerializableClass {
  @Namespace("dspace")
  code?: string;
  @Namespace("dspace")
  reason?: Array<Multilanguage>;

  constructor(value: ICatalogError) {
    super()
    this.code = value.code;
    this.reason = value.reason;
  }
}

export interface ICatalogMessage {
  catalog?: Array<Catalog>;
}

@Serializable("dspace:CatalogMessage")
export class CatalogMessage extends SerializableClass {
  @Namespace("dspace")
  catalog?: Array<Catalog>;

  constructor(value: ICatalogMessage) {
    super()
    this.catalog = value.catalog;
  }
}

export interface Filter {
  "@type": "dspace:Filter";
  [filterKey: string]: string;
};

export interface ICatalogRequestMessage {
  filter?: Array<Filter>;
}

@Serializable("dspace:CatalogRequestMessage")
export class CatalogRequestMessage extends SerializableClass {
  @Namespace("dspace")
  filter?: Array<Filter>;

  constructor(value: ICatalogRequestMessage) {
    super()
    this.filter = value.filter;
  }
}

export interface IDatasetRequestMessage {
  dataset: string;
}

@Serializable("dspace:DatasetRequestMessage")
export class DatasetRequestMessage extends SerializableClass {
  @Namespace("dspace")
  dataset: string;

  constructor(value: IDatasetRequestMessage) {
    super()
    this.dataset = value.dataset;
  }
}
