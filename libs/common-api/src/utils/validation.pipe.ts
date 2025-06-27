import { HttpStatus, Logger, ValidationPipe } from "@nestjs/common";
import { validateSync, ValidatorOptions } from "class-validator";

import { AppError } from "./error.js";

export const validateOrRejectSync = <T extends object>(
  object: T,
  validatorOptions?: ValidatorOptions
): T => {
  const errors = validateSync(object, {
    forbidUnknownValues: false,
    ...validatorOptions
  });
  if (errors.length) {
    throw new AppError(
      `Could not parse object: ${errors.map((e) => e.toString())}`,
      HttpStatus.BAD_REQUEST,
      errors
    );
  }
  return object;
};

export const strictValidationPipe = new ValidationPipe({
  transform: true,
  transformOptions: {
    excludeExtraneousValues: true
  },
  exceptionFactory: (errors) =>
    new AppError(
      {
        message: errors.join(", "),
        errors: errors
      },
      HttpStatus.BAD_REQUEST
    ).andLog(new Logger("ValidationPipe"), "debug")
});

export const validationPipe = new ValidationPipe({
  transform: true,
  forbidUnknownValues: false,
  exceptionFactory: (errors) =>
    new AppError(
      {
        message: errors.join(", "),
        errors: errors
      },
      HttpStatus.BAD_REQUEST
    ).andLog(new Logger("ValidationPipe"), "debug")
});
