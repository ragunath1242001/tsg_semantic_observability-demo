<script setup lang="ts">
import DisplayField from "@tsg-dsp/common-ui/components/DisplayField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { StatusDto } from "@tsg-dsp/wallet-dtos";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

import WalletStatus from "./WalletStatus.vue";

dayjs.extend(relativeTime);

const toast = useToast();

const status = ref<StatusDto>();

const memoryMeter = computed(() => {
  if (!status.value) {
    return {
      count: 1,
      meter: []
    };
  }
  return {
    count: status.value.memoryUsage.heap_size_limit,
    meter: [
      {
        label: `Heap Used (${Math.floor(
          status.value.memoryUsage.used_heap_size / 1048576
        )}MB)`,
        value: status.value.memoryUsage.used_heap_size,
        color: "#60a5fa",
        icon: undefined
      },
      {
        label: `Heap Total (${Math.floor(
          status.value.memoryUsage.total_heap_size / 1048576
        )}MB)`,
        value:
          status.value.memoryUsage.total_heap_size -
          status.value.memoryUsage.used_heap_size,
        color: "#34d399",
        icon: undefined
      },
      {
        label: `Heap Limit (${Math.floor(
          status.value.memoryUsage.heap_size_limit / 1048576
        )}MB)`,
        value:
          status.value.memoryUsage.heap_size_limit -
          status.value.memoryUsage.total_heap_size,
        color: "",
        icon: undefined
      }
    ]
  };
});

const loadStatus = async () => {
  try {
    const response = await http.get<StatusDto>("status");
    status.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to get status",
        defaultMessage: `Could not load status`
      })
    );
  }
};
onMounted(async () => await loadStatus());
</script>

<template>
  <Card
    class="col-span-12"
    style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>Service status</template>
    <template v-if="status" #content>
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-6">
          <DisplayField label="Database">{{
            status.database.status
          }}</DisplayField>
        </div>
        <div class="col-span-12 lg:col-span-6">
          <DisplayField label="Uptime">
            {{ dayjs().subtract(status.uptime, "second").fromNow() }}
          </DisplayField>
        </div>
        <div class="col-span-12">
          <DisplayField label="Memory">
            <MeterGroup :value="memoryMeter.meter" :max="memoryMeter.count">
              <template #label="props">
                <ol
                  class="p-metergroup-label-list p-metergroup-label-list-horizontal"
                  data-pc-section="labellist">
                  <li
                    v-for="(val, index) in props.value"
                    :key="index"
                    class="p-metergroup-label"
                    data-pc-section="label">
                    <span
                      class="p-metergroup-label-marker"
                      data-pc-section="labelmarker"
                      :style="`background-color: ${val.color};`"></span>
                    <span
                      class="p-metergroup-label-text"
                      data-pc-section="labeltext"
                      >{{ val.label }}</span
                    >
                  </li>
                </ol>
              </template>
            </MeterGroup>
          </DisplayField>
        </div>
      </div>
    </template>
  </Card>
  <WalletStatus :status="status" />
</template>
