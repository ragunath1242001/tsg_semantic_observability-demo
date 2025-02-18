import { Query } from "@nestjs/common";
import { strictValidationPipe } from "../validation.pipe.js";

export function PaginationQuery(): ParameterDecorator {
  return function (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) {
    Query(strictValidationPipe)(target, propertyKey, parameterIndex);
  };
}
