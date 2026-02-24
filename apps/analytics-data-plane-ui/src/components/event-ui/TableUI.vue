<script setup lang="ts">
import {
  InternalEventDto,
  UITemplate
} from "@tsg-dsp/analytics-data-plane-dtos";
import { computed } from "vue";

const { uiTemplate, data } = defineProps<{
  uiTemplate: UITemplate;
  data: Array<InternalEventDto>;
}>();

interface Error {
  error: string;
  timestamp: Date;
}

interface TableData {
  timestamp: Date;
  showHeaders: boolean;
  headers: string[];
  rows: Record<string, unknown>[];
}

const latestEvent = computed<TableData | Error>(() => {
  const last = data.reduce((latest, current) => {
    return new Date(current.timestamp) > new Date(latest.timestamp)
      ? current
      : latest;
  }, data[0]);
  if (
    last.data !== undefined &&
    "value" in last.data &&
    typeof last.data.value !== "undefined"
  ) {
    const data = last.data.value;
    if (
      data &&
      typeof data === "object" &&
      "rows" in data &&
      Array.isArray(data.rows) &&
      data.rows.every((row: unknown) => Array.isArray(row))
    ) {
      if (
        "headers" in data &&
        Array.isArray(data.headers) &&
        data.headers.every((h: unknown) => typeof h === "string")
      ) {
        const headers = data.headers as string[];
        return {
          timestamp: last.timestamp,
          showHeaders: true,
          headers: headers,
          rows: data.rows.map((row: unknown[]) => {
            const rowObj: Record<string, unknown> = {};
            row.forEach((value, index) => {
              rowObj[headers[index]] = value;
            });
            return rowObj;
          })
        } as TableData;
      }
      return {
        timestamp: last.timestamp,
        showHeaders: false,
        rows: data.rows.map((row: unknown[]) => {
          const rowObj: Record<string, unknown> = {};
          row.forEach((value, index) => {
            rowObj[`field${index}`] = value;
          });
          return rowObj;
        }),
        headers: data.rows[0].map(
          (_: unknown, index: number) => `field${index}`
        )
      } as TableData;
    }
    return {
      error: "Non-parsable data",
      timestamp: last.timestamp
    };
  }
  return {
    error: "Not available",
    timestamp: last.timestamp
  };
});
</script>

<template>
  <Card>
    <template #title>{{ uiTemplate.description }}</template>
    <template #content>
      <div v-if="'error' in latestEvent" class="text-center text-gray-500">
        {{ latestEvent.error }}
      </div>
      <div v-else class="overflow-auto">
        <DataTable
          :value="latestEvent.rows"
          :header="latestEvent.headers"
          :show-headers="latestEvent.showHeaders">
          <Column
            v-for="(header, index) in latestEvent.headers"
            :key="index"
            :field="header"
            :header="header" />
        </DataTable>
      </div>
    </template>
  </Card>
</template>
