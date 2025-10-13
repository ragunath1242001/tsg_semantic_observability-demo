import { AxiosResponse } from "axios";
import {
  DataTablePageEvent,
  DataTableSortEvent,
  ToastServiceMethods
} from "primevue";
import { Ref, ref, UnwrapRef } from "vue";

import { ErrorContext, toastError } from "./error";

export interface PaginationSetup<T> {
  data: Ref<UnwrapRef<T[]>, UnwrapRef<T[]> | T[]>;
  loading: Ref<boolean>;
  total: Ref<number>;
  page: Ref<number>;
  perPage: Ref<number>;
  totalPages: Ref<number>;
  load: (event?: DataTableSortEvent | DataTablePageEvent) => Promise<void>;
}

export interface SortOptions {
  sortField?: string;
  sortOrder?: 1 | -1 | 0;
}

export interface FetchConfig<T> {
  fetch: (params: Record<string, string>) => Promise<AxiosResponse<T[]>>;
  errorContext: Omit<ErrorContext, "error">;
  toast: ToastServiceMethods;
  initialSort?: SortOptions;
}

export function setupPagination<T>(config: FetchConfig<T>): PaginationSetup<T> {
  const data = ref<T[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(0);
  const perPage = ref(10);
  const totalPages = ref(0);
  const sortOptions = ref<SortOptions>(config.initialSort || {});

  const load = async (event?: DataTableSortEvent | DataTablePageEvent) => {
    loading.value = true;
    if (event) {
      if ("page" in event) {
        page.value = event.page;
      } else {
        page.value = 0;
      }
      if ("rows" in event) {
        perPage.value = event.rows;
      }
    }
    const params: Record<string, string> = {
      page: `${page.value + 1}`,
      per_page: `${perPage.value}`
    };
    if (event?.sortField && typeof event.sortField === "string") {
      sortOptions.value.sortField = event.sortField;
    }
    if (event?.sortOrder !== undefined) {
      sortOptions.value.sortOrder = event.sortOrder as 1 | -1 | 0;
    }
    if (sortOptions.value.sortField) {
      params.order_by = sortOptions.value.sortField;
    }
    if (sortOptions.value.sortOrder) {
      if (sortOptions.value.sortOrder === 1) {
        params.order = "ASC";
      }
      if (sortOptions.value.sortOrder === -1) {
        params.order = "DESC";
      }
    }
    try {
      const response = await config.fetch(params);
      data.value = response.data;
      total.value = parseInt(response.headers["x-total"]);
      perPage.value = parseInt(response.headers["x-per-page"]);
      totalPages.value = parseInt(response.headers["x-total-pages"]);
    } catch (error) {
      loading.value = false;
      config.toast.add(
        toastError({
          ...config.errorContext,
          error: error
        })
      );
      return;
    }
    loading.value = false;
  };

  return {
    data,
    loading,
    total,
    page,
    perPage,
    totalPages,
    load
  };
}
