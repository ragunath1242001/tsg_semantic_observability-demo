<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { computed } from "vue";

import {
  DATA_PROVENANCE_OPTIONS,
  LEGAL_COMPLIANCE_OPTIONS
} from "../../config/metadata-wizard.constants";
import type { ExtendedDataset } from "../../services/DatasetService";

interface Props {
  dataset: ExtendedDataset;
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

const conformsToValue = computed({
  get: () =>
    Array.isArray(localDataset.value.conformsTo)
      ? localDataset.value.conformsTo[0] || ""
      : localDataset.value.conformsTo || "",
  set: (value: string) => {
    const trimmedValue = value?.trim() || "";
    const updatedDataset = { ...localDataset.value };
    updatedDataset.conformsTo = trimmedValue ? [trimmedValue] : [];
    localDataset.value = updatedDataset;
  }
});

// Computed for provenance data
const provenanceActedOnBehalfOf = computed({
  get: () =>
    localDataset.value["prov:wasGeneratedBy"]?.["prov:actedOnBehalfOf"] || "",
  set: (value: string) => {
    const updatedDataset = { ...localDataset.value };
    if (!updatedDataset["prov:wasGeneratedBy"]) {
      updatedDataset["prov:wasGeneratedBy"] = {
        "@type": "prov:Activity",
        "prov:actedOnBehalfOf": "",
        "prov:endedAtTime": ""
      };
    }
    updatedDataset["prov:wasGeneratedBy"]["prov:actedOnBehalfOf"] = value;
    localDataset.value = updatedDataset;
  }
});
</script>

<template>
  <div class="flex flex-col gap-6" style="min-height: 16rem">
    <div class="text-center">
      <h3 class="text-xl font-semibold mb-2">Legal & Compliance</h3>
      <p class="text-gray-600">Legal basis, processes, and compliance</p>
    </div>

    <div class="grid grid-cols-1 gap-4">
      <FormField label="Compliance">
        <Select
          v-model="localDataset['dpv:hasLegalBasis']"
          :options="LEGAL_COMPLIANCE_OPTIONS"
          option-label="label"
          option-value="value"
          class="w-full"
          placeholder="Is there documentation of compliance with ethical standards, conventions, protocols or regulations?" />
      </FormField>

      <FormField label="Data provenance – processes">
        <Select
          v-model="provenanceActedOnBehalfOf"
          :options="DATA_PROVENANCE_OPTIONS"
          option-label="label"
          option-value="value"
          class="w-full"
          placeholder="Are the processes and operations on the data documented?" />
      </FormField>

      <FormField label="Conforms To Standards">
        <InputText
          v-model="conformsToValue"
          class="w-full"
          placeholder="Standards or specifications this dataset conforms to" />
      </FormField>
    </div>
  </div>
</template>
