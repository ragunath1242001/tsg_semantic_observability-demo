import { Id, RdfLanguage, Serializable, RdfValue } from "../decorators";
import { serialize } from "../serialize";
import {
  IsDateString,
  IsDecimal,
  IsNotEmpty,
  Matches,
  ValidationError,
  validateSync,
} from "class-validator";
import {
  ContextDto,
  ReferenceDto,
  MultilanguageDto,
  TimeDto,
  DecimalDto,
  DurationDto,
  URIDto,
} from "./common.dto";
import { v4 as uuid } from "uuid";
// import { Transform } from "class-transformer";

export class ClassValidationError extends Error {
  errors: ValidationError[];
  constructor(msg: string, errors: ValidationError[]) {
    super(msg);
    this.errors = errors;
  }
}

export class SerializableClass<OutType extends ContextDto> {
  validate() {
    const validation = validateSync(this);
    if (validation.length > 0) {
      throw new ClassValidationError(
        `Validation error:\n${validation.map((v) => v.toString()).join("")}`,
        validation
      );
    }
  }

  async serialize(context = true): Promise<OutType> {
    return serialize(this, context);
  }
}

export interface IReference {
  id?: string;
}

export interface IMultilanguage {
  value: string;
  language: string;
}

export class Reference<
  OutType extends ContextDto = ReferenceDto & ContextDto
> extends SerializableClass<OutType> {
  @Id()
  id: string;

  constructor(value: IReference | string) {
    super();
    if (typeof value === "string") {
      this.id = value;
    } else {
      this.id = value?.id || `urn:uuid:${uuid()}`;
    }
  }
}

export class Multilanguage extends SerializableClass<
  MultilanguageDto & ContextDto
> {
  @RdfValue()
  // @Transform(({ obj }) => (typeof obj === "string" ? obj : obj.value))
  @IsNotEmpty()
  value: string;
  @RdfLanguage()
  // @IsNotEmpty()
  language: string = "en";

  constructor(value: IMultilanguage | string) {
    super();
    if (typeof value === "string") {
      this.value = value;
      this.language = "en";
    } else {
      this.value = value?.value;
      this.language = value?.language;
    }
  }
}

@Serializable("xsd:dateTime")
export class Time extends SerializableClass<TimeDto & ContextDto> {
  @RdfValue()
  @IsNotEmpty()
  @IsDateString()
  value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }
}

@Serializable("xsd:decimal")
export class Decimal extends SerializableClass<DecimalDto & ContextDto> {
  @RdfValue()
  @IsNotEmpty()
  @IsDecimal()
  value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }
}

@Serializable("xsd:duration")
export class Duration extends SerializableClass<DurationDto & ContextDto> {
  @RdfValue()
  @Matches(
    /^(-?)P(?=.)((\d+)Y)?((\d+)M)?((\d+)D)?(T(?=.)((\d+)H)?((\d+)M)?(\d*(\.\d+)?S)?)?$/
  )
  value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }
}

@Serializable("xsd:anyURI")
export class URI extends SerializableClass<URIDto & ContextDto> {
  @RdfValue()
  value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }
}

export type Value = Reference | Multilanguage | Time | Decimal | Duration | URI;
