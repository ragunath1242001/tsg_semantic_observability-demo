import { HttpStatus, PipeTransform, Query } from "@nestjs/common";
import { AppError } from "../error.js";
import { PaginationOptionsDto } from "./pagination.options.dto.js";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

const paginationValidationPipe: PipeTransform<any> = {
  transform(value: any): PaginationOptionsDto {
    const transform = plainToInstance(PaginationOptionsDto, value);

    const errors = validateSync(transform, {});
    if (errors.length) {
      throw new AppError(
        {
          message: errors.join(", "),
          errors: errors
        },
        HttpStatus.BAD_REQUEST
      );
    }
    return transform;
  }
};

export function PaginationQuery(): ParameterDecorator {
  return function (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) {
    Query(paginationValidationPipe)(target, propertyKey, parameterIndex);
  };
}
