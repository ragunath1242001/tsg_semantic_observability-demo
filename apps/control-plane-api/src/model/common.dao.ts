import {
  ContextDto,
  deserializeSync,
  IReference,
  SerializableClass,
  serialize
} from "@tsg-dsp/common-dsp";
import { ValueTransformer } from "typeorm";

export type Type<T, ParamT> = {
  // new (): T;
  new (parm: ParamT): T;
};

export function mapToInstances<
  InType extends IReference,
  DtoType extends ContextDto,
  OutType extends SerializableClass<DtoType>
>(
  input: Array<InType> | undefined,
  target: Type<OutType, InType>
): Array<OutType> | undefined {
  return input ? input.map((element) => new target(element)) : undefined;
}

export const jsonLdTransformer: ValueTransformer = {
  to: (value) => serialize(value),
  from: (value) => deserializeSync(value, true)
};
