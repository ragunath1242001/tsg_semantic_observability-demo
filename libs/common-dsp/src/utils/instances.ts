import { ClassConstructor } from "class-transformer";

export function createOptionalInstance<Type>(
  obj: Type | undefined,
  cls: ClassConstructor<Type>
): Type | undefined {
  if (obj === undefined) return undefined;
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

export function createOptionalInstances<Type>(
  arr: Type[] | undefined,
  cls: ClassConstructor<Type>
): Type[] | undefined {
  return arr?.map((obj) => {
    return createInstance(obj, cls);
  });
}

export function createInstances<Type>(
  arr: Type[],
  cls: ClassConstructor<Type>
): Type[] {
  return arr.map((obj) => {
    return createInstance(obj, cls);
  });
}
