/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";

import { defaultContext } from "../jsonld/context.defaults.js";
import { filteredKeys } from "../utils/keys.js";
import {
  getStringDecorator,
  hasDecorator,
  serializableTypes
} from "./decorators.js";

export function serialize(obj: any, root = true): any {
  if (obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map((entry) => serialize(entry, false));
  }
  if (typeof obj !== "object") {
    return obj;
  }
  const serializableType =
    getStringDecorator("serializable", obj) ??
    getStringDecorator(
      "serializable",
      serializableTypes[obj["@type"]]?.prototype
    );
  if (serializableType !== undefined) {
    return serializeJsonLdObject(obj, serializableType, root);
  } else {
    return obj;
  }
}

function serializeJsonLdObject(
  obj: object,
  serializableType: string,
  root: boolean
): object {
  const result: { [name: string]: any } = {};
  if (root) {
    result["@context"] = defaultContext();
  }
  if (serializableType !== "") {
    result["@type"] = serializableType;
  }
  const properties = filteredKeys(obj, ["extraProps"]);
  for (const property of properties) {
    const value = obj[property];
    if (value === undefined) {
      continue;
    }
    if (!Array.isArray(value) || value.length > 0) {
      try {
        if (hasDecorator("id", obj, property)) {
          result["@id"] = value;
        } else if (hasDecorator("language", obj, property)) {
          result["@language"] = value;
        } else if (hasDecorator("value", obj, property)) {
          if (serializableType !== "") {
            result["@type"] = serializableType;
          }
          result["@value"] = value;
        } else {
          const namespace = getStringDecorator("namespace", obj, property);
          const serializedValue = serialize(value, false);
          if (serializedValue != null) {
            if (namespace) {
              result[`${namespace}:${property}`] = serializedValue;
            } else {
              result[`${property}`] = serializedValue;
            }
          }
        }
      } catch (_error) {
        const serializedValue = serialize(value, false);
        if (serializedValue != null) {
          result[`${property}`] = serializedValue;
        }
      }
    }
  }
  return {
    ...result,
    ...obj["extraProps"]
  };
}
