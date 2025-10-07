<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { computed, watch } from "vue";

import type { ExtendedDataset } from "../../services/DatasetService";
import { DatasetService } from "../../services/DatasetService";

interface Props {
  dataset: ExtendedDataset;
  includeSampleData: boolean;
}

interface Emits {
  (e: "update:dataset", value: ExtendedDataset): void;
  (e: "update:includeSampleData", value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localDataset = computed({
  get: () => props.dataset,
  set: (value) => emit("update:dataset", value)
});

const localIncludeSampleData = computed({
  get: () => props.includeSampleData,
  set: (value) => emit("update:includeSampleData", value)
});

const distributionConformsTo = computed({
  get: () => {
    const conformsTo = localDataset.value.distribution?.[0]?.conformsTo;
    return Array.isArray(conformsTo) ? conformsTo[0] || "" : conformsTo || "";
  },
  set: (value: string) => {
    const trimmedValue = value?.trim() || "";
    const updatedDataset = { ...localDataset.value };
    if (updatedDataset.distribution?.[0]) {
      updatedDataset.distribution[0].conformsTo = trimmedValue
        ? [trimmedValue]
        : [];
    }
    localDataset.value = updatedDataset;
  }
});

const accessServiceEndpointURL = computed({
  get: () => {
    const accessService = localDataset.value.distribution?.[0]?.accessService;
    if (typeof accessService === "object" && accessService !== null) {
      return accessService.endpointURL || "";
    }
    return "";
  },
  set: (value: string) => {
    const trimmedValue = value?.trim() || "";
    const updatedDataset = { ...localDataset.value };
    if (updatedDataset.distribution?.[0]) {
      const distribution = updatedDataset.distribution[0];
      if (
        typeof distribution.accessService === "object" &&
        distribution.accessService !== null
      ) {
        distribution.accessService.endpointURL = trimmedValue;
      } else if (trimmedValue) {
        distribution.accessService = {
          "@type": "DataService",
          "@id": "",
          endpointURL: trimmedValue,
          endpointDescription: ""
        };
      }
    }
    localDataset.value = updatedDataset;
  }
});

const policyPermissionAction = computed({
  get: () => {
    const action = localDataset.value.hasPolicy?.[0]?.permission?.[0]?.action;
    return Array.isArray(action) ? action[0] || "" : action || "";
  },
  set: (value: string) => {
    const trimmedValue = value?.trim() || "";
    const updatedDataset = { ...localDataset.value };
    if (updatedDataset.hasPolicy?.[0]?.permission?.[0]) {
      updatedDataset.hasPolicy[0].permission[0].action = trimmedValue || "use";
    }
    localDataset.value = updatedDataset;
  }
});

watch(
  () => props.includeSampleData,
  (newValue) => {
    if (!newValue) {
      const updatedDataset = { ...localDataset.value };
      DatasetService.clearSampleData(updatedDataset);
      localDataset.value = updatedDataset;
    }
  }
);
</script>

<template>
  <div class="flex flex-col gap-6" style="min-height: 16rem">
    <div class="text-center">
      <h3 class="text-xl font-semibold mb-2">Distribution & Access</h3>
      <p class="text-gray-600">Data access, policies, and distributions</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Distribution Title">
        <InputText
          v-model="localDataset.distribution[0].title"
          class="w-full"
          placeholder="e.g., TSG Federated Learning Data Plane" />
      </FormField>

      <FormField label="Distribution Format">
        <InputText
          v-model="localDataset.distribution[0].format"
          class="w-full"
          placeholder="e.g., tsg:FL" />
      </FormField>

      <FormField label="CSVW Reference" class="md:col-span-2">
        <InputText
          v-model="distributionConformsTo"
          class="w-full"
          placeholder="URL to CSVW metadata" />
      </FormField>

      <FormField label="Access Service Endpoint URL" class="md:col-span-2">
        <InputText
          v-model="accessServiceEndpointURL"
          class="w-full"
          placeholder="https://example.org/control-plane" />
      </FormField>

      <FormField label="Policy Assigner">
        <InputText
          v-model="localDataset.hasPolicy[0].assigner"
          class="w-full"
          placeholder="e.g., did:web:example.org" />
      </FormField>

      <FormField label="Policy Permission Action">
        <InputText
          v-model="policyPermissionAction"
          class="w-full"
          placeholder="e.g., use" />
      </FormField>

      <div class="col-span-full border-t pt-4 mt-4">
        <div class="flex items-center mb-4">
          <Checkbox
            v-model="localIncludeSampleData"
            input-id="include-sample-data"
            binary />
          <label for="include-sample-data" class="ml-2 font-medium">
            Include Sample Dataset Information
          </label>
        </div>
        <small class="block text-gray-500 mb-4">
          <i class="pi pi-info-circle mr-1"></i>
          Enable this to provide information about a sample dataset that can be
          used for testing or demonstration purposes.
        </small>

        <div
          v-if="localIncludeSampleData"
          class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Sample Dataset Description" class="md:col-span-2">
            <Textarea
              v-model="localDataset['adms:sample'].description[0]"
              class="w-full"
              rows="2"
              placeholder="Description of the sample dataset" />
          </FormField>

          <FormField label="Sample Download URL">
            <InputText
              v-model="localDataset['adms:sample']['dcat:downloadURL']"
              class="w-full"
              placeholder="URL to download sample dataset" />
          </FormField>

          <FormField label="Sample Media Type">
            <InputText
              v-model="localDataset['adms:sample']['dcat:mediaType']"
              class="w-full"
              placeholder="e.g., application/zip" />
          </FormField>
        </div>
      </div>
    </div>
  </div>
</template>
