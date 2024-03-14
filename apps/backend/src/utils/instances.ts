import { ClassConstructor } from "class-transformer";

export function createOptionalInstance<Type>(
  obj: Type | undefined,
  cls: ClassConstructor<Type>
): Type | undefined {
  if (Object.getPrototypeOf(obj) !== Object.prototype) {
    return obj;
  } else {
    return new cls(obj);
  }
}

export function createInstance<Type>(
  obj: Type,
  cls: ClassConstructor<Type>
): Type {
  if (Object.getPrototypeOf(obj) !== Object.prototype) {
    return obj;
  } else {
    return new cls(obj);
  }
}

export function createInstances<Type>(
  arr: Type[] | undefined,
  cls: ClassConstructor<Type>
): Type[] | undefined {
  return arr?.map((obj) => {
    return createInstance(obj, cls);
  });
}
