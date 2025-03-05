import { AxiosResponse } from "axios";
import { ErrorContext, toastError } from "./error";
import { DataTablePageEvent, DataTableSortEvent, useToast } from "primevue";
import { ref, Ref, UnwrapRef } from "vue";

export interface PaginationSetup<T> {
  data: Ref<UnwrapRef<T[]>, UnwrapRef<T[]> | T[]>;
  loading: Ref<boolean>;
  total: Ref<number>;
  page: Ref<number>;
  perPage: Ref<number>;
  totalPages: Ref<number>;
  load: (event?: DataTableSortEvent | DataTablePageEvent) => Promise<void>;
}

export interface FetchConfig<T> {
  fetch: (params: Record<string, string>) => Promise<AxiosResponse<T[]>>;
  errorContext: Omit<ErrorContext, "error">;
}

export function setupPagination<T>(config: FetchConfig<T>): PaginationSetup<T> {
  const toast = useToast();
  const data = ref<T[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(0);
  const perPage = ref(10);
  const totalPages = ref(0);

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
      params.order_by = event.sortField;
    }
    if (event?.sortOrder !== undefined && event.sortOrder !== null) {
      if (event.sortOrder === 1) {
        params.order = "ASC";
      }
      if (event.sortOrder === -1) {
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
      toast.add(
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
