<script setup lang="ts">
import { Action, AuditSeverity, Resource } from "@tsg-dsp/common-dtos";
import { DataView, DatePicker, Paginator } from "primevue";
import { DataTablePageEvent } from "primevue/datatable";
import { PageState } from "primevue/paginator";
import { useToast } from "primevue/usetoast";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import AuditLogDetailsPanel from "../components/AuditLogDetailsPanel.vue";
import AuditLogSummaryRow from "../components/AuditLogSummaryRow.vue";
import { useAuditLogs } from "../composables/useAuditLogs";

const toast = useToast();
const { data, loading, total, page, perPage, load, filters, applyFilters } =
  useAuditLogs(toast);

const expandedIds = ref<Set<string>>(new Set());
const showFilters = ref(false);
const dateRange = ref<[Date | null, Date | null] | null>(null);
const suppressAutoApply = ref(false);
const autoApplyDelayMs = 400;
let autoApplyTimer: ReturnType<typeof setTimeout> | undefined;

const severityOptions = Object.values(AuditSeverity).map((value) => ({
  label: value.toUpperCase(),
  value
}));
const actionOptions = Object.values(Action).map((value) => ({
  label: value.toUpperCase(),
  value
}));
const resourceTypeOptions = Object.values(Resource).map((value) => ({
  label: value,
  value
}));
const allowedOptions = [
  { label: "All", value: undefined },
  { label: "Allowed", value: true },
  { label: "Denied", value: false }
];
const datePresetOptions = [
  { label: "Last hour", hours: 1 },
  { label: "Last 12h", hours: 12 },
  { label: "Last 24h", hours: 24 },
  { label: "Last 7d", hours: 24 * 7 }
];

const normalizeDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const syncDateRangeFromFilters = () => {
  const from = normalizeDate(filters.value.from);
  const to = normalizeDate(filters.value.to);

  if (!from && !to) {
    dateRange.value = null;
    return;
  }

  dateRange.value = [from, to];
};

const clearAutoApplyTimer = () => {
  if (autoApplyTimer) {
    clearTimeout(autoApplyTimer);
    autoApplyTimer = undefined;
  }
};

const scheduleAutoApply = () => {
  if (suppressAutoApply.value) {
    return;
  }

  clearAutoApplyTimer();
  autoApplyTimer = setTimeout(() => {
    applyFilters();
  }, autoApplyDelayMs);
};

const refreshLogs = () => {
  clearAutoApplyTimer();
  load();
};

const resetFilters = () => {
  clearAutoApplyTimer();
  suppressAutoApply.value = true;
  filters.value = {};
  dateRange.value = null;
  suppressAutoApply.value = false;
  applyFilters();
};

const applyDatePreset = (hours: number) => {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  dateRange.value = [start, end];
};

const toggleExpand = (id: string) => {
  const next = new Set(expandedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expandedIds.value = next;
};

const isExpanded = (id: string) => expandedIds.value.has(id);

const onPage = (event: PageState) => {
  clearAutoApplyTimer();
  load({ page: event.page, rows: event.rows } as DataTablePageEvent);
};

onMounted(() => {
  syncDateRangeFromFilters();
  load();
});

onBeforeUnmount(() => {
  clearAutoApplyTimer();
});

watch(
  dateRange,
  (value) => {
    const [from, to] = value ?? [];
    filters.value.from = from ? from.toISOString() : undefined;
    filters.value.to = to ? to.toISOString() : undefined;
    scheduleAutoApply();
  },
  { deep: true }
);

watch(
  () => [
    Array.isArray(filters.value.severity)
      ? filters.value.severity.join("|")
      : filters.value.severity,
    Array.isArray(filters.value.action)
      ? filters.value.action.join("|")
      : filters.value.action,
    Array.isArray(filters.value.resourceType)
      ? filters.value.resourceType.join("|")
      : filters.value.resourceType,
    filters.value.resultAllowed,
    filters.value.callerSub,
    filters.value.ipAddress,
    filters.value.correlationId
  ],
  () => {
    scheduleAutoApply();
  }
);
</script>

<template>
  <Card>
    <template #title>Audit logs</template>
    <template #subtitle
      >Audit logs of actions performed in this application</template
    >
    <template #content>
      <div class="flex flex-col gap-4">
        <!-- Filter Bar -->
        <div class="flex items-center gap-2">
          <Button
            :icon="showFilters ? 'pi pi-filter-slash' : 'pi pi-filter'"
            :label="showFilters ? 'Hide Filters' : 'Show Filters'"
            text
            size="small"
            @click="showFilters = !showFilters" />
          <Button
            icon="pi pi-refresh"
            label="Refresh"
            text
            severity="secondary"
            size="small"
            :loading="loading"
            @click="refreshLogs" />
          <Button
            v-if="showFilters"
            icon="pi pi-times"
            label="Clear Filters"
            text
            severity="secondary"
            size="small"
            @click="resetFilters" />
        </div>

        <div
          v-if="showFilters"
          class="grid grid-cols-12 gap-3 p-3 surface-ground rounded-lg">
          <div class="col-span-12 md:col-span-4">
            <label class="block text-sm font-semibold mb-1">Severity</label>
            <MultiSelect
              v-model="filters.severity"
              :options="severityOptions"
              option-label="label"
              option-value="value"
              placeholder="Any severity"
              class="w-full"
              display="chip"
              filter />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-sm font-semibold mb-1">Result</label>
            <Select
              v-model="filters.resultAllowed"
              :options="allowedOptions"
              option-label="label"
              option-value="value"
              placeholder="Any result"
              class="w-full" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-sm font-semibold mb-1">Action</label>
            <MultiSelect
              v-model="filters.action"
              :options="actionOptions"
              option-label="label"
              option-value="value"
              placeholder="Any action"
              class="w-full"
              display="chip"
              filter />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-sm font-semibold mb-1"
              >Resource Type</label
            >
            <MultiSelect
              v-model="filters.resourceType"
              :options="resourceTypeOptions"
              option-label="label"
              option-value="value"
              placeholder="Any resource type"
              class="w-full"
              display="chip"
              filter />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-sm font-semibold mb-1">Caller</label>
            <InputText
              v-model="filters.callerSub"
              placeholder="Caller sub"
              class="w-full" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-sm font-semibold mb-1">IP Address</label>
            <InputText
              v-model="filters.ipAddress"
              placeholder="IP address"
              class="w-full" />
          </div>
          <div class="col-span-12 md:col-span-8">
            <label class="block text-sm font-semibold mb-1">Date range</label>
            <DatePicker
              v-model="dateRange"
              selection-mode="range"
              show-time
              hour-format="24"
              show-icon
              icon-display="input"
              show-button-bar
              show-clear
              :manual-input="true"
              class="w-full"
              fluid
              placeholder="Select a date range">
              <template #buttonbar="{ todayCallback, clearCallback }">
                <div class="flex gap-3 w-full flex-row justify-between">
                  <div class="flex flex-wrap gap-2">
                    <Button
                      v-for="preset in datePresetOptions"
                      :key="preset.label"
                      size="small"
                      severity="secondary"
                      variant="outlined"
                      :label="preset.label"
                      @click="applyDatePreset(preset.hours)" />
                  </div>
                  <div class="flex justify-end gap-2">
                    <Button
                      size="small"
                      label="Now"
                      severity="secondary"
                      variant="outlined"
                      @click="todayCallback" />
                    <Button
                      size="small"
                      icon="pi pi-times"
                      severity="danger"
                      variant="outlined"
                      @click="clearCallback" />
                  </div>
                </div>
              </template>
            </DatePicker>
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-sm font-semibold mb-1"
              >Correlation ID</label
            >
            <InputText
              v-model="filters.correlationId"
              placeholder="Correlation ID"
              class="w-full" />
          </div>
        </div>

        <!-- Loading overlay -->
        <div v-if="loading" class="flex justify-center py-8">
          <ProgressSpinner style="width: 40px; height: 40px" stroke-width="4" />
        </div>

        <!-- Empty state -->
        <div v-else-if="!data.length" class="text-center py-8 text-surface-500">
          No audit log entries found.
        </div>

        <!-- Audit Log List -->
        <DataView
          v-else
          :value="data"
          layout="list"
          data-key="id"
          :pt="{
            root: { style: 'border-width: 0' },
            content: { style: 'background: transparent' }
          }">
          <template #list="slotProps">
            <div class="flex flex-col">
              <div
                v-for="item in slotProps.items"
                :key="item.id"
                class="border-b border-surface-200 dark:border-surface-700">
                <AuditLogSummaryRow
                  :entry="item"
                  :expanded="isExpanded(item.id)"
                  @toggle="toggleExpand(item.id)" />

                <div
                  v-if="isExpanded(item.id)"
                  class="px-4 pb-4 pt-2 border-t border-surface-100 dark:border-surface-700">
                  <AuditLogDetailsPanel :entry="item" compact />
                </div>
              </div>
            </div>
          </template>
        </DataView>

        <!-- Pagination -->
        <Paginator
          v-if="total > 0"
          :rows="perPage"
          :total-records="total"
          :first="page * perPage"
          :rows-per-page-options="[10, 25, 50, 100]"
          @page="onPage" />
      </div>
    </template>
  </Card>
</template>
