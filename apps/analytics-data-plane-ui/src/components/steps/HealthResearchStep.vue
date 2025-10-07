<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { computed, ref } from "vue";

import { useArrayManager } from "../../composables/useArrayManager";
import { usePopulationCoverage } from "../../composables/usePopulationCoverage";
import {
  POPULATION_COVERAGE_EXTENDED_OPTIONS,
  POPULATION_COVERAGE_OPTIONS
} from "../../config/metadata-wizard.constants";
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

const { items: healthThemes, addFromInput: addHealthThemesFromInput } =
  useArrayManager<string>(props.dataset["healthdcatap:healthTheme"] || []);

const { items: codingSystems, addFromInput: addCodingSystemsFromInput } =
  useArrayManager<string>(props.dataset["healthdcatap:hasCodingSystem"] || []);

const healthThemesInput = ref("");
const codingSystemsInput = ref("");

const populationCoverageValue = computed({
  get: () => localDataset.value["healthdcatap:populationCoverage"] || "",
  set: (value: string) => {
    const updatedDataset = { ...localDataset.value };
    updatedDataset["healthdcatap:populationCoverage"] = value;
    localDataset.value = updatedDataset;
  }
});

const { basic: populationCoverage, extended: populationCoverageExtended } =
  usePopulationCoverage(populationCoverageValue);

const removeFromArray = (
  array: string[] | undefined,
  index: number
): string[] => {
  if (!array) return [];
  const newArray = [...array];
  newArray.splice(index, 1);
  return newArray.filter((item) => item.trim().length > 0);
};

const handleAddHealthThemes = () => {
  addHealthThemesFromInput(healthThemesInput.value);
  updateHealthThemes();
  healthThemesInput.value = "";
};

const handleAddCodingSystems = () => {
  addCodingSystemsFromInput(codingSystemsInput.value);
  updateCodingSystems();
  codingSystemsInput.value = "";
};

const updateHealthThemes = () => {
  const updatedDataset = { ...localDataset.value };
  updatedDataset["healthdcatap:healthTheme"] = [...healthThemes.value];
  localDataset.value = updatedDataset;
};

const updateCodingSystems = () => {
  const updatedDataset = { ...localDataset.value };
  updatedDataset["healthdcatap:hasCodingSystem"] = [...codingSystems.value];
  localDataset.value = updatedDataset;
};

const handleRemoveHealthTheme = (index: number) => {
  const updatedDataset = { ...localDataset.value };
  updatedDataset["healthdcatap:healthTheme"] = removeFromArray(
    updatedDataset["healthdcatap:healthTheme"],
    index
  );
  localDataset.value = updatedDataset;
};

const handleRemoveCodingSystem = (index: number) => {
  const updatedDataset = { ...localDataset.value };
  updatedDataset["healthdcatap:hasCodingSystem"] = removeFromArray(
    updatedDataset["healthdcatap:hasCodingSystem"],
    index
  );
  localDataset.value = updatedDataset;
};
</script>

<template>
  <div class="flex flex-col gap-6" style="min-height: 16rem">
    <div class="text-center">
      <h3 class="text-xl font-semibold mb-2">Health & Research</h3>
      <p class="text-gray-600">Health-specific metadata and research context</p>
      <p v-if="!isFairDataPoint" class="text-orange-600 text-sm mt-2">
        <i class="pi pi-info-circle mr-1"></i>
        This step is optional for non-FAIR data points
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Number of Records">
        <InputNumber
          v-model="localDataset['healthdcatap:numberOfRecords']"
          class="w-full"
          placeholder="Total number of records" />
      </FormField>

      <FormField label="Number of Unique Individuals">
        <InputNumber
          v-model="localDataset['healthdcatap:numberOfUniqueIndividuals']"
          class="w-full"
          placeholder="Number of unique individuals" />
      </FormField>

      <FormField label="Health Themes" :label-width="1" class="md:col-span-2">
        <div
          v-if="localDataset['healthdcatap:healthTheme']?.length"
          class="flex gap-2 flex-wrap mb-3">
          <Chip
            v-for="(theme, index) in localDataset['healthdcatap:healthTheme']"
            :key="index"
            :label="theme"
            removable
            @remove="handleRemoveHealthTheme(index)" />
        </div>
        <div class="flex gap-2">
          <InputText
            v-model="healthThemesInput"
            placeholder="Add health themes (comma separated, use Wikidata URLs)"
            class="flex-1"
            @keyup.enter="handleAddHealthThemes" />
          <Button
            label="Add"
            icon="pi pi-plus"
            size="small"
            @click="handleAddHealthThemes" />
        </div>
      </FormField>

      <FormField label="Coding Systems" :label-width="1" class="md:col-span-2">
        <div
          v-if="localDataset['healthdcatap:hasCodingSystem']?.length"
          class="flex gap-2 flex-wrap mb-3">
          <Chip
            v-for="(system, index) in localDataset[
              'healthdcatap:hasCodingSystem'
            ]"
            :key="index"
            :label="system"
            removable
            @remove="handleRemoveCodingSystem(index)" />
        </div>
        <div class="flex gap-2">
          <InputText
            v-model="codingSystemsInput"
            placeholder="Add coding systems (comma separated, use Wikidata URLs or system names)"
            class="flex-1"
            @keyup.enter="handleAddCodingSystems" />
          <Button
            label="Add"
            icon="pi pi-plus"
            size="small"
            @click="handleAddCodingSystems" />
        </div>
      </FormField>

      <FormField label="Population Coverage">
        <Select
          v-model="populationCoverage"
          class="w-full"
          :options="POPULATION_COVERAGE_OPTIONS"
          option-label="label"
          option-value="value"
          placeholder="Population coverage information" />
      </FormField>

      <FormField label="Population Coverage Extended">
        <Select
          v-model="populationCoverageExtended"
          class="w-full"
          :options="POPULATION_COVERAGE_EXTENDED_OPTIONS"
          option-label="label"
          option-value="value"
          placeholder="Extended population coverage information" />
      </FormField>
    </div>
  </div>
</template>
