import "reflect-metadata";
import { Multilanguage, Reference } from "./dsp/common";
import { serializableSymbol, idSymbol, languageSymbol, valueSymbol, namespaceSymbol, serializableTypes } from "./decorators";

export function serialize(obj: any, root: boolean = true): any {
  if (Array.isArray(obj)) {
    return obj.map((entry) => serialize(entry, false));
  }
  if (typeof obj !== "object") {
    return obj;
  }
  let serializableType = undefined;
  try {
    serializableType = Reflect.getMetadata(serializableSymbol, obj);
  } catch (e) {
    console.log(e);
  }
  if (serializableType === undefined && '@type' in obj && obj['@type'] in serializableTypes) {
    serializableType = serializableTypes[obj['@type']]
  }
  if (serializableType !== undefined) {
    let result: { [name: string]: any } = {
      "@type": serializableType,
    };
    if (root) {
      result = {
        '@context': 'https://w3id.org/dspace/v0.8/context.json',
        ...result
      }
    }
    const properties = Object.getOwnPropertyNames(obj);
    properties.forEach((property) => {
      const value = obj[property];
      if (value === undefined) {
        return;
      }
      if (!Array.isArray(value) || value.length > 0) {
        try {
          if (Reflect.getMetadata(idSymbol, obj, property)) {
            result["@id"] = value;
          } else if (Reflect.getMetadata(languageSymbol, obj, property)) {
            result["@language"] = value;
          } else if (Reflect.getMetadata(valueSymbol, obj, property)) {
            result["@value"] = value;
          } else {
            const namespace = Reflect.getMetadata(namespaceSymbol, obj, property);
            if (namespace) {
              result[`${namespace}:${property}`] = serialize(value, false);
            } else {
              result[`${property}`] = serialize(value, false);
            }
          }
        } catch (error) {
          result[`${property}`] = serialize(value, false);
        }
      }
    });
    return result;
  } else {
    if (Object.keys(obj).length === 2 && 'value' in obj && 'language' in obj) {
      return {
        '@value': obj['value'],
        '@language': obj['language']
      }
    }
    if (Object.keys(obj).length === 1 && Object.keys(obj)[0] === 'id') {
      return {
        '@id': obj['id']
      }
    }
    return obj;
  }
}

export function deserialize<Type>(obj: any): Type {
  if (Array.isArray(obj)) {
    return obj.map((entry) => deserialize(entry)) as Type;
  }
  if (typeof obj !== "object") {
    return obj as Type;
  }
  const resolvedType = serializableTypes[obj['@type']]?.prototype

  if (resolvedType === undefined) {
    if ("@value" in obj && "@language" in obj) {
      return new Multilanguage({value: obj['@value'], language: obj['@language']}) as Type
    } else if ("@id" in obj) {
      return new Reference({id: obj['@id']}) as Type
    } else {
      return obj as Type
    }
  }

  if (Reflect.getMetadata(serializableSymbol, resolvedType)) {
    let result: { [name: string]: any } = {}
    const properties = Object.getOwnPropertyNames(new resolvedType.constructor({}));
    properties.every((property) => {
      if (Reflect.getMetadata(idSymbol, resolvedType, property)) {
        result[property] = obj['@id'];
      } else if (Reflect.getMetadata(languageSymbol, resolvedType, property)) {
        result[property] = obj['@language'];
      } else if (Reflect.getMetadata(valueSymbol, resolvedType, property)) {
        result = obj['@value'];
        return false;
      } else {
        const namespace = Reflect.getMetadata(namespaceSymbol, resolvedType, property);
        if (namespace) {
          result[property] = deserialize(obj[`${namespace}:${property}`]);
        } else {
          result[property] = obj[property];
        }
      }
      return true;
    });
    return new resolvedType.constructor(result)
  } else {
    return obj as Type;
  }
}