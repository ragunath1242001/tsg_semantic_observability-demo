import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import { Namespace, Serializable } from "../../decorators.js";
import { SerializableClass, withExtraProps } from "../common.js";
import {
  CatalogErrorDto,
  CatalogRequestMessageDto,
  DatasetRequestMessageDto
} from "./messages.dto.js";

export interface ICatalogError {
  code?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reason?: Array<any>;
}

@Serializable("CatalogError")
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

export interface ICatalogRequestMessage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: Array<any>;
}

@Serializable("CatalogRequestMessage")
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

@Serializable("DatasetRequestMessage")
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
