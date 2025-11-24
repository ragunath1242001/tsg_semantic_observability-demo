<script setup lang="ts">
import {
  InternalEventDto,
  UITemplate
} from "@tsg-dsp/analytics-data-plane-dtos";
import { formatDate } from "@tsg-dsp/common-ui/utils/date";
import { computed, ref } from "vue";

const { uiTemplate, data } = defineProps<{
  uiTemplate: UITemplate;
  data: Array<InternalEventDto>;
}>();

const modalVisible = ref(false);

const latestEvent = computed(() => {
  const last = data.reduce((latest, current) => {
    return new Date(current.timestamp) > new Date(latest.timestamp)
      ? current
      : latest;
  }, data[0]);
  if ("value" in last.data && typeof last.data.value !== "undefined") {
    return {
      value: last.data.value,
      timestamp: last.timestamp
    };
  }
  return {
    value: "Not available",
    timestamp: last.timestamp
  };
});

const sortedEventsData = computed(() => {
  return data
    .slice()
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .map((event) => ({
      timestamp: event.timestamp,
      value:
        "value" in event.data && typeof event.data.value !== "undefined"
          ? event.data.value
          : "Not available"
    }));
});
</script>

<template>
  <Card>
    <template #title>
      <div class="flex justify-between items-center">
        <span>{{ uiTemplate.description }}</span>
        <Button
          icon="pi pi-history"
          text
          rounded
          @click="modalVisible = true" />
      </div>
    </template>
    <template #content>
      <div class="flex flex-col h-full justify-center items-center">
        <span class="text-3xl font-bold mb-4">{{ latestEvent.value }}</span>
        <span class="text-gray-500">{{
          formatDate(latestEvent.timestamp)
        }}</span>
      </div>
      <Dialog
        v-model:visible="modalVisible"
        :modal="false"
        :closable="true"
        header="Event History"
        :style="{ width: '600px' }">
        <DataTable
          :value="sortedEventsData"
          :paginator="true"
          :rows="10"
          :rows-per-page-options="[5, 10, 20]"
          responsive-layout="scroll"
          class="w-full">
          <Column field="timestamp" header="Timestamp" sortable>
            <template #body="slotProps">
              {{ formatDate(slotProps.data.timestamp) }}
            </template>
          </Column>
          <Column field="value" header="Value" sortable />
        </DataTable>
      </Dialog>
    </template>
  </Card>
</template>
