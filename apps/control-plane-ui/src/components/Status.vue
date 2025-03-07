<script setup lang="ts">
import DisplayField from "@tsg-dsp/common-ui/components/DisplayField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { StatusDto } from "@tsg-dsp/control-plane-dtos";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";

dayjs.extend(relativeTime);

const toast = useToast();
const http = injectStrict(AxiosKey);

const status = ref<StatusDto>();

const negotiationStateColors = {
  "dspace:REQUESTED": "#60a5fa",
  "dspace:OFFERED": "#fbbf24",
  "dspace:ACCEPTED": "#34d399",
  "dspace:AGREED": "#38bdf8",
  "dspace:VERIFIED": "#c084fc",
  "dspace:FINALIZED": "#10b981",
  "dspace:TERMINATED": "#f87171"
};

const transferStateColors = {
  "dspace:REQUESTED": "#60a5fa",
  "dspace:STARTED": "#34d399",
  "dspace:TERMINATED": "#f87171",
  "dspace:COMPLETED": "#10b981",
  "dspace:SUSPENDED": "#fbbf24"
};

const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const mapToMeter = (
  data: { state: string; count: number; role: string }[] | undefined,
  colors: Record<string, string>
) => {
  if (!data) {
    return {
      labels: [],
      datasets: []
    };
  }
  const additionIfEmpty =
    data.reduce((acc, curr) => acc + curr.count, 0) === 0 ? 1 : 0;
  return {
    labels: data.map(
      (negotiations) =>
        `${capitalize(negotiations.state.replace("dspace:", ""))} (${
          negotiations.count
        })`
    ),
    datasets: [
      {
        data: data.map((negotiations) => negotiations.count + additionIfEmpty),
        backgroundColor: data.map((negotiations) => colors[negotiations.state])
      }
    ]
  };
};

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

const providerNegotiationsMeter = computed(() => {
  return mapToMeter(
    status.value?.negotiations?.filter(
      (negotiations) => negotiations.role === "provider"
    ),
    negotiationStateColors
  );
});

const consumerNegotiationsMeter = computed(() => {
  return mapToMeter(
    status.value?.negotiations?.filter(
      (negotiations) => negotiations.role === "consumer"
    ),
    negotiationStateColors
  );
});

const providerTransfersMeter = computed(() => {
  return mapToMeter(
    status.value?.transfers?.filter(
      (transfers) => transfers.role === "provider"
    ),
    transferStateColors
  );
});

const consumerTransfersMeter = computed(() => {
  return mapToMeter(
    status.value?.transfers?.filter(
      (transfers) => transfers.role === "consumer"
    ),
    transferStateColors
  );
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
  aspectRatio: 1.5,
  plugins: {
    legend: {
      position: "left",
      maxWidth: 200
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
  <Card
    class="col-span-12"
    style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>Negotiations</template>
    <template v-if="status" #content>
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-6">
          <DisplayField label="Incoming">
            <Chart
              type="doughnut"
              :data="providerNegotiationsMeter"
              :options="options"
              class="w-[20rem] h-[15rem]" />
          </DisplayField>
        </div>
        <div class="col-span-12 lg:col-span-6">
          <DisplayField label="Outgoing">
            <Chart
              type="doughnut"
              :data="consumerNegotiationsMeter"
              :options="options"
              class="w-[20rem] h-[15rem]" />
          </DisplayField>
        </div>
      </div>
    </template>
  </Card>
  <Card
    class="col-span-12"
    style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>Transfers</template>
    <template v-if="status" #content>
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-6">
          <DisplayField label="Incoming">
            <Chart
              type="doughnut"
              :data="providerTransfersMeter"
              :options="options"
              class="w-[20rem] h-[15rem]" />
          </DisplayField>
        </div>
        <div class="col-span-12 lg:col-span-6">
          <DisplayField label="Outgoing">
            <Chart
              type="doughnut"
              :data="consumerTransfersMeter"
              :options="options"
              class="w-[20rem] h-[15rem]" />
          </DisplayField>
        </div>
      </div>
    </template>
  </Card>
</template>
