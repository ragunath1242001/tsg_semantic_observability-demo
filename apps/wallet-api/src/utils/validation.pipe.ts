import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { AppError } from "./error.js";

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
