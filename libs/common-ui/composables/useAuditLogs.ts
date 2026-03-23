import { AuditLogQueryParams } from "@tsg-dsp/common-dtos";
import { ToastServiceMethods } from "primevue/toastservice";
import { ref } from "vue";

import http from "../utils/http";
import { PaginationSetup, setupPagination } from "../utils/pagination";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  severity: string;
  correlationId?: string;
  callerSub: string;
  callerType: string;
  callerServiceName?: string;
  callerUsername?: string;
  callerDidId?: string;
  onBehalfOfSub?: string;
  onBehalfOfUsername?: string;
  onBehalfOfDidId?: string;
  delegationChain?: string[];
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  resultAllowed: boolean;
  resultReason?: string;
  resultMatchedPermission?: string;
  resultEffectiveScope?: string;
}

export function useAuditLogs(toast: ToastServiceMethods) {
  const filters = ref<AuditLogQueryParams>({});
  const serializeFilter = <T>(value?: T | T[]) => {
    if (value === undefined) {
      return undefined;
    }

    return Array.isArray(value) ? value.join(",") : String(value);
  };

  const pagination: PaginationSetup<AuditLogEntry> =
    setupPagination<AuditLogEntry>({
      fetch: (params: Record<string, string>) => {
        const queryParams: Record<string, string> = { ...params };

        const f = filters.value;
        const severity = serializeFilter(f.severity);
        const action = serializeFilter(f.action);
        const resourceType = serializeFilter(f.resourceType);

        if (severity) queryParams.severity = severity;
        if (f.callerSub) queryParams.callerSub = f.callerSub;
        if (f.callerType) queryParams.callerType = f.callerType;
        if (action) queryParams.action = action;
        if (resourceType) queryParams.resourceType = resourceType;
        if (f.resultAllowed !== undefined)
          queryParams.resultAllowed = String(f.resultAllowed);
        if (f.correlationId) queryParams.correlationId = f.correlationId;
        if (f.ipAddress) queryParams.ipAddress = f.ipAddress;
        if (f.requestPath) queryParams.requestPath = f.requestPath;
        if (f.from) queryParams.from = f.from;
        if (f.to) queryParams.to = f.to;

        return http.get("/management/audit-logs", { params: queryParams });
      },
      errorContext: {
        summary: "Audit Logs",
        defaultMessage: "Failed to load audit logs"
      },
      toast,
      initialSort: { sortField: "timestamp", sortOrder: -1 }
    });

  const applyFilters = () => {
    pagination.page.value = 0;
    pagination.load();
  };

  const clearFilters = () => {
    filters.value = {};
    applyFilters();
  };

  return {
    ...pagination,
    filters,
    applyFilters,
    clearFilters
  };
}
