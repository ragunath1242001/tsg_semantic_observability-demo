import { Query } from "@nestjs/common";
import { strictValidationPipe } from "../validation.pipe";

export function PaginationQuery(): ParameterDecorator {
  return function (
    target: Object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) {
    Query(strictValidationPipe)(target, propertyKey, parameterIndex);
  };
}
