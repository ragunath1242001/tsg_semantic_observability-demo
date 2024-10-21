/* eslint-disable @typescript-eslint/no-explicit-any */
export const serializableSymbol = Symbol("custom:serializable");
export const idSymbol = Symbol("custom:id");
export const languageSymbol = Symbol("custom:language");
export const valueSymbol = Symbol("custom:value");
export const namespaceSymbol = Symbol("custom:namespace");
export const keepTypesSymbol = Symbol("custom:keepTypes");
export const ldTypeSymbol = Symbol("custom:ldType");
export const serializableTypes: { [key: string]: Function } = {};

export function symbolMap(
  key:
    | "id"
    | "language"
    | "value"
    | "keepTypes"
    | "serializable"
    | "namespace"
    | "ldType"
): Symbol {
  switch (key) {
    case "id":
      return idSymbol;
    case "language":
      return languageSymbol;
    case "value":
      return valueSymbol;
    case "keepTypes":
      return keepTypesSymbol;
    case "serializable":
      return serializableSymbol;
    case "namespace":
      return namespaceSymbol;
    case "ldType":
      return ldTypeSymbol;
  }
}

export function hasDecorator(
  key: "id" | "language" | "value" | "keepTypes" | "serializable",
  target: Object,
  propertyKey?: string | symbol
): boolean {
  try {
    const symbol = symbolMap(key);
    return Reflect.getMetadata(symbol, target, propertyKey) ? true : false;
  } catch (e) {
    return false;
  }
}

export function getStringDecorator(
  key: "serializable" | "namespace",
  target: object,
  propertyKey?: string | symbol
): string | undefined {
  try {
    const symbol = symbolMap(key);
    const metadata = Reflect.getMetadata(symbol, target, propertyKey);
    if (metadata !== undefined && typeof metadata === "string") {
      return metadata;
    }
    return undefined;
  } catch (e) {
    return undefined;
  }
}

export function getFunctionDecorator(
  key: "ldType",
  target: object,
  propertyKey?: string | symbol
): Function | undefined {
  try {
    const symbol = symbolMap(key);
    const metadata = Reflect.getMetadata(symbol, target, propertyKey);
    if (metadata !== undefined && typeof metadata === "function") {
      return metadata;
    }
    return undefined;
  } catch (e) {
    return undefined;
  }
}

export function Serializable(type: string): ClassDecorator {
  return (target: any) => {
    serializableTypes[type] = target;
    Reflect.defineMetadata(serializableSymbol, type, target.prototype);
  };
}

export function Id(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) =>
    Reflect.defineMetadata(idSymbol, true, target, propertyKey);
}

export function RdfLanguage(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) =>
    Reflect.defineMetadata(languageSymbol, true, target, propertyKey);
}

export function RdfValue(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) =>
    Reflect.defineMetadata(valueSymbol, true, target, propertyKey);
}

export function Namespace(ns: string): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) =>
    Reflect.defineMetadata(namespaceSymbol, ns, target, propertyKey);
}

export function KeepTypes(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) =>
    Reflect.defineMetadata(keepTypesSymbol, true, target, propertyKey);
}

export function LDType(type: () => Function): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) =>
    Reflect.defineMetadata(ldTypeSymbol, type, target, propertyKey);
}
