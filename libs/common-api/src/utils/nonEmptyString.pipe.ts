import { ArgumentMetadata, HttpStatus, PipeTransform } from "@nestjs/common";

import { AppError } from "./error.js";

export class NonEmptyStringPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    if (typeof value !== "string" || value.length === 0) {
      let message = "Value must be a non-empty string";
      if (metadata.type === "query" && metadata.data) {
        message = `Query parameter ${metadata.data} must be a non-empty string`;
      }
      throw new AppError(message, HttpStatus.BAD_REQUEST);
    }
    return value;
  }
}

export const nonEmptyStringPipe = new NonEmptyStringPipe();
