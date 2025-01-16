import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { AppError } from "./error.js";
import { ValidatorOptions, validateSync } from "class-validator";

export const validateOrRejectSync = <T extends object>(
  object: T,
  validatorOptions?: ValidatorOptions
): T => {
  const errors = validateSync(object, validatorOptions);
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
    )
});

export const validationPipe = new ValidationPipe({
  transform: true,
  exceptionFactory: (errors) =>
    new AppError(
      {
        message: errors.join(", "),
        errors: errors
      },
      HttpStatus.BAD_REQUEST
    )
});
