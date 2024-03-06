/* eslint-disable @typescript-eslint/no-explicit-any */
export const serializableSymbol = Symbol("custom:serializable");
export const idSymbol = Symbol("custom:id");
export const languageSymbol = Symbol("custom:language");
export const valueSymbol = Symbol("custom:value");
export const namespaceSymbol = Symbol("custom:namespace");
export const serializableTypes: { [key: string]: any } = {};

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

export function Language(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) =>
    Reflect.defineMetadata(languageSymbol, true, target, propertyKey);
}

export function Value(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) =>
    Reflect.defineMetadata(valueSymbol, true, target, propertyKey);
}

export function Namespace(ns: string): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) =>
    Reflect.defineMetadata(namespaceSymbol, ns, target, propertyKey);
}
