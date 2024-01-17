/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import { Multilanguage, Reference } from "./dsp/common";
import { serializableSymbol, idSymbol, languageSymbol, valueSymbol, namespaceSymbol, serializableTypes } from "./decorators";
import { compact } from "./jsonld";

export async function serialize(obj: any, root = true): Promise<any> {
  if (obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return await Promise.all(obj.map((entry) => serialize(entry, false)));
  }
  if (typeof obj !== "object") {
    return obj;
  }
  let serializableType;
  try {
    serializableType = Reflect.getMetadata(serializableSymbol, obj);
  } catch (e) {
    serializableType = undefined;
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
    for (const property of properties) {
      const value = obj[property];
      if (value === undefined) {
        continue;
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
            const serializedValue = await serialize(value, false);
            if (serializedValue !== null && serializedValue !== undefined) {
              if (namespace) {
                result[`${namespace}:${property}`] = serializedValue;
              } else {
                result[`${property}`] = serializedValue;
              }
            }
          }
        } catch (error) {
          const serializedValue = await serialize(value, false);
          if (serializedValue !== null && serializedValue !== undefined) {
            result[`${property}`] = serializedValue;
          }
        }
      }
    }
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

export async function deserialize<Type>(obj: any, root = true): Promise<Type> {
  if (root) {
    obj = await compact(obj, true);
  }

  if (Array.isArray(obj)) {
    return Promise.all(obj.map((entry) => deserialize(entry, false))) as Promise<Type>;
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
    const properties = Object.getOwnPropertyNames(new resolvedType.constructor({}, false));

    for (const property of properties) {
      if (Reflect.getMetadata(idSymbol, resolvedType, property)) {
        result[property] = obj['@id'];
      } else if (Reflect.getMetadata(languageSymbol, resolvedType, property)) {
        result[property] = obj['@language'];
      } else if (Reflect.getMetadata(valueSymbol, resolvedType, property)) {
        result = obj['@value'];
        break;
      } else {
        const namespace = Reflect.getMetadata(namespaceSymbol, resolvedType, property);
        if (namespace) {
          result[property] = await deserialize(obj[`${namespace}:${property}`], false);
        } else {
          result[property] = obj[property];
        }
      }
    }

    const resultObject = new resolvedType.constructor(result, true)
    if (root) {
      resultObject.validate()
    }
    return resultObject;
  } else {
    return obj as Type;
  }
}