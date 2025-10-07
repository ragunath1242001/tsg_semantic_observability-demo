<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { computed } from "vue";

import { DATA_QUALITY_CONFIG } from "../../config/metadata-wizard.constants";
import type { ExtendedDataset } from "../../services/DatasetService";

interface Props {
  dataset: ExtendedDataset;
  isFairDataPoint: boolean;
}

interface Emits {
  (e: "update:dataset", value: ExtendedDataset): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localDataset = computed({
  get: () => props.dataset,
  set: (value) => emit("update:dataset", value)
});

const updateQualityAnnotation = (field: string, value: string) => {
  const updatedDataset = { ...localDataset.value };
  if (!updatedDataset["dqv:hasQualityAnnotation"]) {
    updatedDataset["dqv:hasQualityAnnotation"] = { "dqv:averageTime": "" };
  }
  updatedDataset["dqv:hasQualityAnnotation"][field] = value;
  localDataset.value = updatedDataset;
};

const averageTime = computed({
  get: () =>
    localDataset.value["dqv:hasQualityAnnotation"]?.["dqv:averageTime"] || "",
  set: (value: string) => updateQualityAnnotation("dqv:averageTime", value)
});
</script>

<template>
  <div class="flex flex-col gap-6" style="min-height: 16rem">
    <div class="text-center">
      <h3 class="text-xl font-semibold mb-2">Data Quality</h3>
      <p class="text-gray-600">Quality annotations and measurements</p>
      <p v-if="!isFairDataPoint" class="text-orange-600 text-sm mt-2">
        <i class="pi pi-info-circle mr-1"></i>
        This step is optional for non-FAIR data points
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4">
      <FormField label="Average Time from Data Access to Data Release">
        <InputText
          v-model="averageTime"
          class="w-full"
          placeholder="Quality assessment information" />
      </FormField>

      <FormField label="Accuracy Assessment">
        <Select
          v-model="localDataset['dqv:accuracy']"
          class="w-full"
          :options="DATA_QUALITY_CONFIG.accuracy"
          option-label="label"
          option-value="value"
          placeholder="Is accuracy of the dataset documented?" />
      </FormField>

      <FormField label="Coherence Assessment">
        <Select
          v-model="localDataset['dqv:coherence']"
          class="w-full"
          :options="DATA_QUALITY_CONFIG.coherence"
          option-label="label"
          option-value="value"
          placeholder="Is coherence of the dataset documented?" />
      </FormField>

      <FormField label="Completeness Assessment">
        <Select
          v-model="localDataset['dqv:completeness']"
          class="w-full"
          :options="DATA_QUALITY_CONFIG.completeness"
          option-label="label"
          option-value="value"
          placeholder="Is completeness of the dataset documented?" />
      </FormField>

      <FormField label="Consistency Assessment">
        <Select
          v-model="localDataset['dqv:consistency']"
          class="w-full"
          :options="DATA_QUALITY_CONFIG.consistency"
          option-label="label"
          option-value="value"
          placeholder="Is consistency of the dataset documented?" />
      </FormField>

      <FormField label="Precision Assessment">
        <Select
          v-model="localDataset['dqv:precision']"
          class="w-full"
          :options="DATA_QUALITY_CONFIG.precision"
          option-label="label"
          option-value="value"
          placeholder="Is precision of the dataset documented?" />
      </FormField>

      <FormField label="Validity Assessment">
        <Select
          v-model="localDataset['dqv:validity']"
          class="w-full"
          :options="DATA_QUALITY_CONFIG.validity"
          option-label="label"
          option-value="value"
          placeholder="Availability of a conformance report for the data model" />
      </FormField>
    </div>
  </div>
</template>
