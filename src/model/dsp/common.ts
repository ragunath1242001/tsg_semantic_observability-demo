import crypto from "crypto";
import { Id, Language, Serializable, Value } from "../decorators";
import { serialize } from "../serialize";
import { IsDateString, IsDecimal, IsNotEmpty, Matches, ValidationError, validateSync } from "class-validator";

export class ClassValidationError extends Error {
  errors: ValidationError[];
  constructor(msg: string, errors: ValidationError[]){
    super(msg)
    this.errors = errors;
  }
}

export class SerializableClass {
  validate() {
    const validation = validateSync(this)
    if (validation.length > 0) {
      throw new ClassValidationError(`Validation error: ${validation.map(v => v.toString()).join('\n')}`, validation)
    }
  }
  serialize(context: boolean = true): any {
    return serialize(this, context)
  }
}

export interface IReference {
  id?: string
}

export interface IMultilanguage {
  value: string
  language: string
}

export class Reference extends SerializableClass {
  @Id()
  id: string

  constructor (value: IReference) {
    super()
    this.id = value.id  || `urn:uuid:${crypto.randomUUID()}`
  }
}

export class Multilanguage extends SerializableClass {
  @Value()
  @IsNotEmpty()
  value: string;
  @Language()
  @IsNotEmpty()
  language: string;

  constructor (value: IMultilanguage) {
    super()
    this.value = value.value;
    this.language = value.language;
  }
}

@Serializable("xsd:dateTime")
export class Time extends SerializableClass {
  @Value()
  @IsNotEmpty()
  @IsDateString()
  value: string;

  constructor (value: string) {
    super()
    this.value = value
  }
}

@Serializable("xsd:decimal")
export class Decimal extends SerializableClass {
  @Value()
  @IsNotEmpty()
  @IsDecimal()
  value: string;

  constructor (value: string) {
    super()
    this.value = value
  }
}

@Serializable("xsd:duration")
export class Duration extends SerializableClass {
  @Value()
  @Matches(/^(-?)P(?=.)((\d+)Y)?((\d+)M)?((\d+)D)?(T(?=.)((\d+)H)?((\d+)M)?(\d*(\.\d+)?S)?)?$/)
  value: string;

  constructor (value: string) {
    super()
    this.value = value
  }
}

@Serializable("xsd:anyURI")
export class URI extends SerializableClass {
  @Value()
  value: string;

  constructor (value: string) {
    super()
    this.value = value
  }
}

export type Value = Reference | Multilanguage | Time | Decimal | Duration | URI;