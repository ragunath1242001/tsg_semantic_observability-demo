import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import { LDType, Namespace, Serializable } from "../../decorators.js";
import { SerializableClass, withExtraProps } from "../common.js";
import { Catalog } from "./catalog.js";
import {
  CatalogErrorDto,
  CatalogMessageDto,
  CatalogRequestMessageDto,
  DatasetRequestMessageDto
} from "./messages.dto.js";

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

  constructor(value: withExtraProps<ICatalogError>) {
    super(value);
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
  @LDType(() => Catalog)
  catalog?: Array<Catalog>;

  constructor(value: withExtraProps<ICatalogMessage>) {
    super(value);
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

  constructor(value: withExtraProps<ICatalogRequestMessage>) {
    super(value);
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

  constructor(value: withExtraProps<IDatasetRequestMessage>) {
    super(value);
    this.dataset = value.dataset;
  }
}
