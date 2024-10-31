/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import { Multilanguage, Reference } from "./dsp/common";
import {
  serializableTypes,
  hasDecorator,
  getStringDecorator,
  getFunctionDecorator
} from "./decorators";
import { compact } from "../jsonld/jsonld";
import { filteredKeys } from "../utils/keys";

export async function deserialize<Type>(
  obj: any,
  root = true,
  useType?: Function
): Promise<Type> {
  if (root) {
    obj = await compact(obj);
  }
  return deserializeSync<Type>(obj, root, useType);
}

export function deserializeSync<Type>(
  obj: any,
  root = true,
  useType?: Function
): Type {
  if (obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map((entry) => deserializeSync(entry, false, useType)) as Type;
  }
  if (typeof obj !== "object") {
    return obj as Type;
  }
  const resolvedType =
    serializableTypes[obj["@type"]]?.prototype ?? useType?.prototype;

  if (resolvedType === undefined) {
    if ("@value" in obj && "@language" in obj) {
      return new Multilanguage({
        value: obj["@value"],
        language: obj["@language"]
      }) as Type;
    } else if ("@id" in obj) {
      return new Reference({ id: obj["@id"] }) as Type;
    } else {
      return obj as Type;
    }
  }

  if (hasDecorator("serializable", resolvedType)) {
    return deserializeJsonLd(obj, resolvedType, root);
  } else {
    return obj as Type;
  }
}

function deserializeJsonLd(obj: any, resolvedType: any, root: boolean) {
  let result: { [name: string]: any } = {};
  const properties = Object.getOwnPropertyNames(
    new resolvedType.constructor({}, false)
  );
  const parsedProperties = ["@context", "@type"];
  for (const property of properties) {
    if (hasDecorator("id", resolvedType, property)) {
      result[property] = obj["@id"];
      parsedProperties.push("@id");
    } else if (hasDecorator("language", resolvedType, property)) {
      result[property] = obj["@language"];
      parsedProperties.push("@language");
    } else if (hasDecorator("value", resolvedType, property)) {
      result = obj["@value"];
      parsedProperties.push("@value");
      break;
    } else {
      const ldType = getFunctionDecorator("ldType", resolvedType, property)?.();
      const namespace = getStringDecorator("namespace", resolvedType, property);
      if (namespace) {
        result[property] = deserializeSync(
          obj[`${namespace}:${property}`],
          false,
          ldType
        );
        parsedProperties.push(`${namespace}:${property}`);
      } else {
        result[property] = obj[property];
        parsedProperties.push(`${property}`);
      }
    }
  }

  const resultObject = new resolvedType.constructor(result, true);
  if (root) {
    resultObject.validate();
  }
  filteredKeys(obj, parsedProperties).forEach((property) => {
    resultObject.extraProps[property] = obj[property];
  });
  return resultObject;
}
