import { UseInterceptors } from "@nestjs/common";
import { PaginationInterceptor } from "./pagination.interceptor";
import { ApiResponseMetadata } from "@nestjs/swagger";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { HeadersObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

const paginationHeaders: HeadersObject = {
  "x-page": {
    description: "Index of the current page (starting at 1)",
    schema: { type: "integer" }
  },
  "x-prev-page": {
    description: "Index of the previous page",
    schema: { type: "integer" },
    required: false
  },
  "x-next-page": {
    description: "Index of the next page",
    schema: { type: "integer" },
    required: false
  },
  "x-per-page": {
    description: "Number of items per page",
    schema: { type: "integer" }
  },
  "x-total-pages": {
    description: "Total number of pages",
    schema: { type: "integer" }
  },
  "x-total": {
    description: "Total number of items",
    schema: { type: "integer" }
  },
  link: {
    description: "Web Linking to other pages of this resource",
    schema: { type: "string" }
  }
};

function injectPaginationHeaders(responses: {
  [status: number]: ApiResponseMetadata;
}): { [status: number]: ApiResponseMetadata } {
  if (Object.keys(responses).length === 0) {
    return {
      200: {
        description: "Successful response",
        headers: paginationHeaders
      }
    };
  }
  return Object.fromEntries(
    Object.entries(responses).map(([status, response]) => [
      status,
      parseInt(status) >= 200 && parseInt(status) < 300
        ? {
            ...response,
            headers: { ...paginationHeaders, ...response.headers }
          }
        : response
    ])
  );
}
/**
 * Decorator to add pagination interceptor and define API headers to the response.
 *
 * *NOTE*: Must be placed above any `@ApiResponse()` decorators.
 *
 * @returns MethodDecorator
 */
export function UsePagination(): MethodDecorator {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    UseInterceptors(PaginationInterceptor)(target, propertyKey, descriptor);
    if (descriptor) {
      const responses: { [status: number]: ApiResponseMetadata } =
        Reflect.getMetadata(DECORATORS.API_RESPONSE, descriptor.value) || {};
      Reflect.defineMetadata(
        DECORATORS.API_RESPONSE,
        injectPaginationHeaders(responses),
        descriptor.value
      );
      return descriptor;
    }
    const responses =
      Reflect.getMetadata(DECORATORS.API_RESPONSE, target) || {};
    Reflect.defineMetadata(
      DECORATORS.API_RESPONSE,
      injectPaginationHeaders(responses),
      target
    );
    return target;
  };
}
