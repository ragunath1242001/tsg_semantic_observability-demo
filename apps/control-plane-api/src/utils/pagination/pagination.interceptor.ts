import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { Request, Response } from "express";
import {
  Paginated,
  PaginationParametersExtended
} from "./pagination.parameters";

export class PaginationInterceptor<T>
  implements NestInterceptor<Paginated<T>, T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<Paginated<T>>
  ): Observable<T> {
    return next.handle().pipe(
      map((paginatedResult) => {
        const request: Request = context.switchToHttp().getRequest();
        const response: Response = context.switchToHttp().getResponse();
        const { data, ...parameters } = paginatedResult;
        if (parameters.total === -1) {
          return data;
        }

        const page = parseInt(request.query.page as string) || 1;
        const perPage = parseInt(request.query.per_page as string) || 100;
        const extendedParameters: PaginationParametersExtended = {
          ...parameters,
          page: page,
          perPage: perPage,
          totalPages: Math.ceil(parameters.total / perPage)
        };

        this.setHeaders(response, request, extendedParameters);
        return data;
      })
    );
  }

  private setHeaders(
    response: Response,
    request: Request,
    parameters: PaginationParametersExtended
  ) {
    const links: Record<string, string | undefined> = {
      first: this.createLink(request, 1, parameters),
      last: this.createLink(request, parameters.totalPages, parameters)
    };
    if (parameters.page > 1) {
      links.prev = this.createLink(request, parameters.page - 1, parameters);
    }
    if (parameters.page < parameters.totalPages) {
      links.next = this.createLink(request, parameters.page + 1, parameters);
    }
    response.links(links);
    response.set("x-page", parameters.page.toString());
    if (parameters.page > 1) {
      response.set(
        "x-prev-page",
        Math.min(parameters.page - 1, parameters.totalPages).toString()
      );
    }
    if (parameters.page < parameters.totalPages) {
      response.set("x-next-page", Math.max(parameters.page + 1, 1).toString());
    }
    response.set("x-per-page", parameters.perPage.toString());
    response.set("x-total", parameters.total.toString());
    response.set("x-total-pages", parameters.totalPages.toString());
  }

  private createLink(
    request: Request,
    page: number,
    parameters: PaginationParametersExtended
  ) {
    if (page < 1 || page > parameters.totalPages) {
      return undefined;
    }
    const queryParams = new URLSearchParams(
      request.query as Record<string, string>
    );
    queryParams.set("page", page.toString());
    queryParams.set("per_page", parameters.perPage.toString());

    const baseUrl = `${request.protocol}://${request.get("host")}${request.originalUrl.split("?")[0]}`;
    return `${baseUrl}?${queryParams.toString()}`;
  }
}
