<script setup lang="ts">
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { computed, onMounted, ref } from "vue";
import http from "@tsg-dsp/common-ui/utils/http";
import DisplayField from "@tsg-dsp/common-ui/components/DisplayField.vue";
import { useToast } from "primevue/usetoast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { StatusDto } from "@tsg-dsp/wallet-dtos";

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

const options = {
  cutout: "75%",
  plugins: {
    legend: {
      position: "left"
    },
    tooltip: {
      callbacks: {
        label: (context) => " " + context.label
      }
    }
  }
};
</script>

<template>
  <Card
    class="col-span-12"
    style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>Service status</template>
    <template #content v-if="status">
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
                    class="p-metergroup-label"
                    data-pc-section="label"
                    v-for="(val, index) in props.value">
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
  <Card class="col-span-12 lg:col-span-6 xl:col-span-4 h-full">
    <template #content v-if="status">
      <div class="flex justify-between mb-4">
        <div>
          <span
            class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
            >Keys</span
          >
          <div class="text-surface-900 dark:text-surface-0 font-medium">
            <ul>
              {{
                status.keys
              }}
              registered keys
            </ul>
          </div>
        </div>
        <div
          class="flex items-center justify-center bg-blue-100 rounded-border"
          style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1">
          <i class="pi pi-key text-blue-500 text-xl"></i>
        </div>
      </div>
    </template>
  </Card>
  <Card class="col-span-12 lg:col-span-6 xl:col-span-4 h-full">
    <template #content v-if="status">
      <div class="flex justify-between mb-4">
        <div>
          <span
            class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
            >Credentials</span
          >
          <div class="text-surface-900 dark:text-surface-0 font-medium">
            {{ status.credentials.selfSigned }} self-signed credentials,
            {{ status.credentials.thirdParty }} third-party signed credentials
          </div>
        </div>
        <div
          class="flex items-center justify-center bg-orange-100 rounded-border"
          style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1">
          <i class="pi pi-file-check text-orange-500 text-xl"></i>
        </div>
      </div>
    </template>
  </Card>
  <Card class="col-span-12 lg:col-span-6 xl:col-span-4 h-full">
    <template #content v-if="status">
      <div class="flex justify-between mb-4">
        <div>
          <span
            class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
            >Issuance</span
          >
          <div class="text-surface-900 dark:text-surface-0 font-medium">
            {{ status.issuance.issued }} credentials issued,
            {{ status.issuance.open }} open offers
          </div>
        </div>
        <div
          class="flex items-center justify-center bg-cyan-100 rounded-border"
          style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1">
          <i class="pi pi-file-export text-cyan-500 text-xl"></i>
        </div>
      </div>
    </template>
  </Card>
</template>
