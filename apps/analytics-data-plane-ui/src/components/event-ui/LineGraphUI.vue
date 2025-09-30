<script setup lang="ts">
import {
  InternalEventDto,
  UITemplate
} from "@tsg-dsp/analytics-data-plane-dtos";
import { ChartData, ChartOptions } from "chart.js";
import { computed, defineProps } from "vue";
import { Line } from "vue-chartjs";

import { registerChartJs } from "../../utils/chart";

registerChartJs();

const { uiTemplate, eventName, minHeight, data } = defineProps<{
  uiTemplate: UITemplate;
  eventName: string;
  minHeight: string;
  data: Array<InternalEventDto>;
}>();

const labels = computed(() => data.map((event) => new Date(event.timestamp)));
const values = computed(() =>
  data.map((event) => {
    if (
      event.data &&
      "value" in event.data &&
      typeof event.data.value === "number"
    ) {
      return event.data.value;
    }
    return 0;
  })
);

const options: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,

  scales: {
    x: {
      type: "time",
      title: {
        display: true,
        text: "Time"
      },
      time: {
        minUnit: "minute"
      }
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: eventName
      }
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      mode: "index",
      intersect: false
    }
  }
};

const chartData = computed<ChartData<"line">>(() => ({
  labels: labels.value,
  datasets: [
    {
      label: eventName,
      data: values.value,
      fill: false,
      borderColor: "rgb(75, 192, 192)",
      tension: 0.1
    }
  ]
}));
</script>

<template>
  <Card>
    <template #title>{{ uiTemplate.description }}</template>
    <template #content>
      <Line :data="chartData" :options="options" :style="{ minHeight }" />
    </template>
  </Card>
</template>
