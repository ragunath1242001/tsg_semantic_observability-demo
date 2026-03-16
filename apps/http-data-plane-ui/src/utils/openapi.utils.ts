import { toastError } from "@tsg-dsp/common-ui/utils/error";
import axios from "axios";
import { ToastServiceMethods } from "primevue";
import { Ref } from "vue";

import {
  DereferencedOperationObject,
  DereferencedPathsObject,
  DereferencedRequestBodyObject,
  DereferencedSchemaObject
} from "./openapi.parser";

export interface Operation {
  path: string;
  method: string;
  operation: DereferencedOperationObject;
}

export function pathsObjectToArray(
  paths: DereferencedPathsObject
): Operation[] {
  return Object.entries(paths).flatMap(([path, pathItem]) => {
    const summary = pathItem.summary;
    const description = pathItem.description;
    const parameters = pathItem.parameters;
    return ["get", "post", "put", "delete", "patch", "options", "head", "trace"]
      .map((method) => {
        if (pathItem[method]) {
          pathItem[method].summary = pathItem[method].summary || summary;
          pathItem[method].description =
            pathItem[method].description || description;
          pathItem[method].parameters =
            pathItem[method].parameters || parameters;
          return {
            path,
            method,
            operation: {
              summary,
              description,
              parameters,
              ...pathItem[method]
            } satisfies DereferencedOperationObject
          };
        }
        return null;
      })
      .filter((op): op is Operation => op !== null);
  });
}

export function requestBodyToTester(
  requestBody: DereferencedRequestBodyObject,
  bodyRaw: Ref<string>,
  toast: ToastServiceMethods
) {
  let bodyType: "none" | "form-data" | "x-www-form-urlencoded" | "raw";
  let bodyLanguage: string = "json";
  let bodySchema: DereferencedSchemaObject | null = null;
  const headers: { key: string; value: string }[] = [];

  const contentTypes = Object.keys(requestBody.content);
  const firstContentType = contentTypes[0];
  const mediaType = requestBody.content[firstContentType];

  // Set appropriate body type
  if (firstContentType.includes("application/json")) {
    bodyType = "raw";
    bodyLanguage = "json";
    headers.push({ key: "Content-Type", value: "application/json" });
    if (mediaType.schema) {
      try {
        JSON.stringify(mediaType.schema);
        bodySchema = mediaType.schema;
      } catch (_) {
        // Invalid schema, ignore
      }
    }
    // Add example if available
    if (mediaType.example) {
      bodyRaw.value = JSON.stringify(mediaType.example, null, 2);
    } else if (mediaType.examples) {
      const firstExample = Object.values(mediaType.examples)[0];
      console.log(`firstExample: ${JSON.stringify(firstExample)}`);
      if (firstExample && typeof firstExample === "object") {
        if (
          "serializedValue" in firstExample &&
          typeof firstExample.serializedValue === "string"
        ) {
          console.log(`Using serializedValue: ${firstExample.serializedValue}`);
          bodyRaw.value = firstExample.serializedValue;
        } else if ("value" in firstExample) {
          console.log(`Using value: ${JSON.stringify(firstExample.value)}`);
          bodyRaw.value = JSON.stringify(firstExample.value, null, 2);
        } else if ("externalValue" in firstExample) {
          console.log(
            `Fetching externalValue from: ${firstExample.externalValue}`
          );
          axios
            .get(firstExample.externalValue)
            .then((res) => {
              bodyRaw.value = JSON.stringify(res.data, null, 2);
            })
            .catch((error) => {
              toast.add(
                toastError({
                  error,
                  summary: "Error loading external example",
                  defaultMessage: `Could not load external example from ${firstExample.externalValue}`
                })
              );
            });
        }
      }
    } else if (mediaType.schema?.example) {
      bodyRaw.value = JSON.stringify(mediaType.schema.example, null, 2);
    } else if (mediaType.schema) {
      // Generate a basic JSON skeleton based on the schema
      bodyRaw.value = JSON.stringify(
        generateSkeleton(mediaType.schema),
        null,
        2
      );
    }
  } else if (firstContentType.includes("multipart/form-data")) {
    bodyType = "form-data";
  } else if (firstContentType.includes("application/x-www-form-urlencoded")) {
    bodyType = "x-www-form-urlencoded";
  } else if (
    firstContentType.includes("text/") ||
    firstContentType.includes("xml") ||
    firstContentType.includes("yaml")
  ) {
    bodyType = "raw";
    bodyLanguage = firstContentType.includes("xml")
      ? "xml"
      : firstContentType.includes("yaml")
        ? "yaml"
        : "text";
    headers.push({ key: "Content-Type", value: firstContentType });

    // Add example if available
    if (mediaType.example) {
      bodyRaw.value = String(mediaType.example);
    } else if (mediaType.examples) {
      const firstExample = Object.values(mediaType.examples)[0];
      if (firstExample && typeof firstExample === "object") {
        if ("serializedValue" in firstExample) {
          bodyRaw.value = String(firstExample.serializedValue);
        } else if ("externalValue" in firstExample) {
          console.log(
            `Fetching externalValue from: ${firstExample.externalValue}`
          );
          axios
            .get(firstExample.externalValue, {
              responseType: "text"
            })
            .then((res) => {
              bodyRaw.value = res.data;
            })
            .catch((error) => {
              toast.add(
                toastError({
                  error,
                  summary: "Error loading external example",
                  defaultMessage: `Could not load external example from ${firstExample.externalValue}`
                })
              );
            });
        }
      }
    } else if (mediaType.schema?.example) {
      bodyRaw.value = String(mediaType.schema.example);
    }
  } else {
    bodyType = "raw";
    bodyLanguage = "text";
    headers.push({ key: "Content-Type", value: firstContentType });
  }
  return { bodyType, bodyLanguage, bodySchema, headers };
}

const generateSkeleton = (schema: DereferencedSchemaObject, depth = 0): any => {
  if (schema.type === "object") {
    if (!schema.properties) {
      return {};
    }
    const obj: any = {};
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (depth > 10) {
        obj[key] = {};
        continue;
      }
      if (schema.required && schema.required.includes(key)) {
        obj[key] = generateSkeleton(propSchema, depth + 1);
        continue;
      }
      if (typeof propSchema.required === "boolean" && propSchema.required) {
        obj[key] = generateSkeleton(propSchema, depth + 1);
        continue;
      }
    }
    return obj;
  } else if (schema.type === "array") {
    if (!schema.items || depth > 10) {
      return [];
    }
    return [generateSkeleton(schema.items, depth + 1)];
  } else if (schema.type === "string") {
    if (schema.example) {
      return schema.example;
    } else if (schema.examples && Array.isArray(schema.examples)) {
      return schema.examples[0];
    } else if (schema.examples && typeof schema.examples === "object") {
      return Object.values(schema.examples)[0];
    } else {
      return "";
    }
  } else if (schema.type === "number" || schema.type === "integer") {
    return 0;
  } else if (schema.type === "boolean") {
    return false;
  } else {
    return null;
  }
};
