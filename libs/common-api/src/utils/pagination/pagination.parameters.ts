export interface Paginated<T> extends PaginationParameters {
  data: T;
}

export interface PaginationParameters {
  total: number;
}

export interface PaginationParametersExtended extends PaginationParameters {
  page: number;
  perPage: number;
  totalPages: number;
}
