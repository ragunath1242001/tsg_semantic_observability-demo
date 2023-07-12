import crypto from "crypto";
import { Id, Language, Serializable, Value } from "../decorators";
import { serialize } from "../serialize";

export class SerializableClass {
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

// TODO: Decorator
export class Reference extends SerializableClass {
  @Id()
  id: string

  constructor(value: IReference) {
    super()
    this.id = value.id  || `urn:uuid:${crypto.randomUUID()}`
  }
}

export class Multilanguage extends SerializableClass {
  @Value()
  value: string;
  @Language()
  language: string;

  constructor(value: IMultilanguage) {
    super()
    this.value = value.value;
    this.language = value.language;
  }
}

@Serializable("xsd:dateTime")
export class Time extends SerializableClass {
  @Value()
  value: string;

  constructor (value: string) {
    super()
    this.value = value
  }
}

@Serializable("xsd:decimal")
export class Decimal extends SerializableClass {
  @Value()
  value: string;

  constructor (value: string) {
    super()
    this.value = value
  }
}

@Serializable("xsd:duration")
export class Duration extends SerializableClass {
  @Value()
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