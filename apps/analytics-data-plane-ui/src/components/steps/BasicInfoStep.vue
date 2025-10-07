<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { computed, ref } from "vue";

import { useArrayManager } from "../../composables/useArrayManager";
import type { ExtendedDataset } from "../../services/DatasetService";

interface Props {
  dataset: ExtendedDataset;
  isFairDataPoint: boolean;
}

interface Emits {
  (e: "update:dataset", value: ExtendedDataset): void;
  (e: "update:isFairDataPoint", value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localDataset = computed({
  get: () => props.dataset,
  set: (value) => emit("update:dataset", value)
});

const localIsFairDataPoint = computed({
  get: () => props.isFairDataPoint,
  set: (value) => emit("update:isFairDataPoint", value)
});

const { items: keywords, addFromInput: addKeywordsFromInput } =
  useArrayManager<string>(props.dataset.keyword || []);

const updateKeywords = () => {
  const updatedDataset = { ...localDataset.value };
  updatedDataset.keyword = [...keywords.value];
  localDataset.value = updatedDataset;
};

const keywordsInput = ref("");

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

const removeFromArray = (
  array: string[] | undefined,
  index: number
): string[] => {
  if (!array) return [];
  const newArray = [...array];
  newArray.splice(index, 1);
  return newArray.filter((item) => item.trim().length > 0);
};

const handleAddKeywords = () => {
  addKeywordsFromInput(keywordsInput.value);
  updateKeywords();
  keywordsInput.value = "";
};

const handleRemoveKeyword = (index: number) => {
  const updatedDataset = { ...localDataset.value };
  updatedDataset.keyword = removeFromArray(updatedDataset.keyword, index);
  localDataset.value = updatedDataset;
};
</script>

<template>
  <div class="flex flex-col gap-6" style="min-height: 16rem">
    <div class="text-center">
      <h3 class="text-xl font-semibold mb-2">Basic Information</h3>
      <p class="text-gray-600">Essential metadata about your dataset</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Title *">
        <InputText
          v-model="localDataset.title"
          class="w-full"
          placeholder="Enter a descriptive title" />
      </FormField>

      <FormField label="Identifier">
        <InputText
          v-model="localDataset['@id']"
          class="w-full"
          placeholder="Auto-generated if empty" />
      </FormField>

      <FormField label="Description *" :label-width="1" class="md:col-span-2">
        <Textarea
          v-model="localDataset.description[0]"
          class="w-full"
          rows="3"
          placeholder="Provide a detailed description of the dataset" />
      </FormField>

      <FormField label="Keywords" :label-width="1" class="md:col-span-2">
        <div
          v-if="localDataset.keyword?.length"
          class="flex gap-2 flex-wrap mb-3">
          <Chip
            v-for="(keyword, index) in localDataset.keyword"
            :key="index"
            :label="keyword"
            removable
            @remove="handleRemoveKeyword(index)" />
        </div>
        <div class="flex gap-2">
          <InputText
            v-model="keywordsInput"
            placeholder="Add keywords (comma separated)"
            class="flex-1"
            @keyup.enter="handleAddKeywords" />
          <Button
            label="Add"
            icon="pi pi-plus"
            size="small"
            @click="handleAddKeywords" />
        </div>
      </FormField>

      <FormField label="Conforms To">
        <InputText
          v-model="conformsToValue"
          class="w-full"
          placeholder="e.g., heracles:LMF" />
      </FormField>
    </div>

    <div class="mt-4">
      <div class="flex items-center">
        <Checkbox
          v-model="localIsFairDataPoint"
          input-id="fair-data-point"
          binary />
        <label for="fair-data-point" class="ml-2">
          This dataset is for a
          <a
            class="text-primary-600 underline"
            href="https://gitlab.com/tno-tsg/dataspace-protocol/utils/fair-data-point"
            >FAIR data point</a
          >
        </label>
      </div>
      <small class="block text-gray-500 mt-1">
        <i class="pi pi-exclamation-triangle"></i> Enable this checkbox for
        enriched metadata creation suited for FAIR data points.
      </small>
    </div>
  </div>
</template>
