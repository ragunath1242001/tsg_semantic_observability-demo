import { HttpStatus } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import { Field } from "@tsg-dsp/common-dtos";
import { Ajv } from "ajv";
import jsonpath from "jsonpath";

const ajv = new Ajv();

export function validateField(
  fieldDescriptor: Field,
  vpJson: any,
  throwOnError = true
): {
  error: boolean;
  found: boolean;
  validated?: boolean;
  message?: string;
} {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let field: any | undefined = undefined;
  for (const path of fieldDescriptor.path) {
    const queryResult = jsonpath.query(vpJson, path, 1);
    if (queryResult[0]) {
      field = queryResult[0];
      break;
    }
  }
  if (field === undefined) {
    if (fieldDescriptor.optional === true) {
      return {
        error: false,
        found: false,
        validated: false
      };
    } else {
      if (throwOnError) {
        throw new AppError(
          `Could not find field matching ${fieldDescriptor.path} (${fieldDescriptor.name})`,
          HttpStatus.FORBIDDEN
        );
      } else {
        return {
          error: true,
          found: false,
          message: `Could not find field matching ${fieldDescriptor.path} (${fieldDescriptor.name})`
        };
      }
    }
  }
  if (fieldDescriptor.filter) {
    const validate = ajv.compile(fieldDescriptor.filter);
    if (Array.isArray(field) && fieldDescriptor.filter.type !== "array") {
      let validated = false;
      for (const item of field) {
        if (validate(item)) {
          validated = true;
          break;
        }
      }
      if (!validated) {
        if (throwOnError) {
          throw new AppError(
            `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`,
            HttpStatus.FORBIDDEN
          );
        } else {
          return {
            error: true,
            found: true,
            validated: false,
            message: `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`
          };
        }
      }
    } else {
      if (!validate(field)) {
        if (throwOnError) {
          throw new AppError(
            `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`,
            HttpStatus.FORBIDDEN
          );
        } else {
          return {
            error: true,
            found: true,
            validated: false,
            message: `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`
          };
        }
      }
    }
  }
  return {
    error: false,
    found: true,
    validated: true
  };
}
