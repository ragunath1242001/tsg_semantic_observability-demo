import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Namespace, Serializable } from "../../decorators";
import { SerializableClass } from "../common";
import { Catalog } from "./catalog";
import {
  CatalogErrorDto,
  CatalogMessageDto,
  CatalogRequestMessageDto,
  DatasetRequestMessageDto,
} from "@tsg-dsp/common";

export interface ICatalogError {
  code?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reason?: Array<any>;
}

@Serializable("dspace:CatalogError")
export class CatalogError extends SerializableClass<CatalogErrorDto> {
  @Namespace("dspace")
  @IsOptional()
  @IsString()
  code?: string;
  @Namespace("dspace")
  @ValidateNested()
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reason?: Array<any>;

  constructor(value: ICatalogError) {
    super();
    this.code = value.code;
    this.reason = value.reason;
  }
}

export interface ICatalogMessage {
  catalog?: Array<Catalog>;
}

@Serializable("dspace:CatalogMessage")
export class CatalogMessage extends SerializableClass<CatalogMessageDto> {
  @Namespace("dspace")
  @ValidateNested()
  @IsOptional()
  catalog?: Array<Catalog>;

  constructor(value: ICatalogMessage) {
    super();
    this.catalog = value.catalog;
  }
}

export interface ICatalogRequestMessage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: Array<any>;
}

@Serializable("dspace:CatalogRequestMessage")
export class CatalogRequestMessage extends SerializableClass<CatalogRequestMessageDto> {
  @Namespace("dspace")
  @ValidateNested()
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: Array<any>;

  constructor(value: ICatalogRequestMessage) {
    super();
    this.filter = value.filter;
  }
}

export interface IDatasetRequestMessage {
  dataset: string;
}

@Serializable("dspace:DatasetRequestMessage")
export class DatasetRequestMessage extends SerializableClass<DatasetRequestMessageDto> {
  @Namespace("dspace")
  @IsNotEmpty()
  @IsString()
  dataset: string;

  constructor(value: IDatasetRequestMessage) {
    super();
    this.dataset = value.dataset;
  }
}
