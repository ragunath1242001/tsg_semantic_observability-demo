<script setup lang="ts">
import type { DatasetDto } from "@tsg-dsp/common-dsp";
import { computed, onMounted, ref, watch } from "vue";

import { WIZARD_STEPS } from "../config/metadata-wizard.constants";
import {
  DatasetService,
  type ExtendedDataset
} from "../services/DatasetService";
import BasicInfoStep from "./steps/BasicInfoStep.vue";
import DataQualityStep from "./steps/DataQualityStep.vue";
import DistributionStep from "./steps/DistributionStep.vue";
import HealthResearchStep from "./steps/HealthResearchStep.vue";
import LegalComplianceStep from "./steps/LegalComplianceStep.vue";
import ReviewStep from "./steps/ReviewStep.vue";

interface Props {
  modelValue?: DatasetDto | null;
}

interface Emits {
  (e: "update:modelValue", value: DatasetDto): void;
  (e: "completed", value: DatasetDto): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const activeStep = ref("1");
const isFairDataPoint = ref(false);
const includeSampleData = ref(false);
const dataset = ref<ExtendedDataset>(DatasetService.createDefaultDataset());

const steps = computed(() => {
  return WIZARD_STEPS.map((step) => ({
    ...step,
    disabled: step.optional && !isFairDataPoint.value
  }));
});

const getNextStep = (currentStep: string): string => {
  if (currentStep === "1") {
    return !isFairDataPoint.value ? "4" : "2";
  }
  if (currentStep === "2") {
    return !isFairDataPoint.value ? "4" : "3";
  }
  if (currentStep === "3") {
    return "4";
  }
  const currentIndex = parseInt(currentStep);
  return (currentIndex + 1).toString();
};

const getPreviousStep = (currentStep: string): string => {
  if (currentStep === "4") {
    return !isFairDataPoint.value ? "1" : "3";
  }
  if (currentStep === "3") {
    return !isFairDataPoint.value ? "1" : "2";
  }
  const currentIndex = parseInt(currentStep);
  return Math.max(1, currentIndex - 1).toString();
};

const completeWizard = () => {
  const finalDataset = DatasetService.prepareFinalDataset(dataset.value);
  emit("update:modelValue", finalDataset);
  emit("completed", finalDataset);
};

const canComplete = computed(() => {
  return DatasetService.isValidForCompletion(dataset.value);
});

const initializeFromDataset = (datasetData: DatasetDto | null) => {
  dataset.value = DatasetService.mergeWithDefaults(datasetData);
  includeSampleData.value = DatasetService.hasSampleData(dataset.value);
};

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      initializeFromDataset(newValue);
    }
  }
);

onMounted(() => {
  initializeFromDataset(props.modelValue || null);
});
</script>

<template>
  <div class="max-w-1200px">
    <Card class="mb-6">
      <template #content>
        <div class="text-center mb-4">
          <h3 class="text-xl font-semibold mb-2">Create Dataset Metadata</h3>
          <p class="text-gray-600">
            Complete the following steps to create comprehensive metadata for
            your dataset.
          </p>
        </div>
      </template>
    </Card>

    <Stepper v-model:value="activeStep">
      <StepList>
        <Step v-for="step in steps" :key="step.id" :value="step.id">
          <span
            class="flex items-center gap-2"
            :class="{ 'opacity-50': step.disabled }">
            <i :class="step.icon" />
            {{ step.title }}
          </span>
        </Step>
      </StepList>

      <StepPanels>
        <StepPanel v-slot="{ activateCallback }" value="1">
          <BasicInfoStep
            :dataset="dataset"
            :is-fair-data-point="isFairDataPoint"
            @update:dataset="dataset = $event"
            @update:is-fair-data-point="isFairDataPoint = $event" />

          <div class="flex pt-6 justify-end">
            <Button
              label="Next"
              icon="pi pi-arrow-right"
              icon-pos="right"
              @click="activateCallback(getNextStep('1'))" />
          </div>
        </StepPanel>

        <StepPanel v-slot="{ activateCallback }" value="2">
          <HealthResearchStep
            :dataset="dataset"
            :is-fair-data-point="isFairDataPoint"
            @update:dataset="dataset = $event" />

          <div class="flex pt-6 justify-between">
            <Button
              label="Back"
              severity="secondary"
              icon="pi pi-arrow-left"
              @click="activateCallback(getPreviousStep('2'))" />
            <Button
              :label="
                !isFairDataPoint ? 'Skip to Distribution & Access' : 'Next'
              "
              icon="pi pi-arrow-right"
              icon-pos="right"
              @click="activateCallback(getNextStep('2'))" />
          </div>
        </StepPanel>

        <StepPanel v-slot="{ activateCallback }" value="3">
          <DataQualityStep
            :dataset="dataset"
            :is-fair-data-point="isFairDataPoint"
            @update:dataset="dataset = $event" />

          <div class="flex pt-6 justify-between">
            <Button
              label="Back"
              severity="secondary"
              icon="pi pi-arrow-left"
              @click="activateCallback(getPreviousStep('3'))" />
            <Button
              label="Next"
              icon="pi pi-arrow-right"
              icon-pos="right"
              @click="activateCallback(getNextStep('3'))" />
          </div>
        </StepPanel>

        <StepPanel v-slot="{ activateCallback }" value="4">
          <DistributionStep
            :dataset="dataset"
            :include-sample-data="includeSampleData"
            @update:dataset="dataset = $event"
            @update:include-sample-data="includeSampleData = $event" />

          <div class="flex pt-6 justify-between">
            <Button
              label="Back"
              severity="secondary"
              icon="pi pi-arrow-left"
              @click="activateCallback(getPreviousStep('4'))" />
            <Button
              label="Next"
              icon="pi pi-arrow-right"
              icon-pos="right"
              @click="activateCallback(getNextStep('4'))" />
          </div>
        </StepPanel>

        <StepPanel v-slot="{ activateCallback }" value="5">
          <LegalComplianceStep
            :dataset="dataset"
            @update:dataset="dataset = $event" />

          <div class="flex pt-6 justify-between">
            <Button
              label="Back"
              severity="secondary"
              icon="pi pi-arrow-left"
              @click="activateCallback(getPreviousStep('5'))" />
            <Button
              label="Next"
              icon="pi pi-arrow-right"
              icon-pos="right"
              @click="activateCallback(getNextStep('5'))" />
          </div>
        </StepPanel>

        <StepPanel v-slot="{ activateCallback }" value="6">
          <ReviewStep
            :dataset="dataset"
            :is-fair-data-point="isFairDataPoint"
            :include-sample-data="includeSampleData" />

          <div class="flex pt-6 justify-between">
            <Button
              label="Back"
              severity="secondary"
              icon="pi pi-arrow-left"
              @click="activateCallback(getPreviousStep('6'))" />
            <Button
              label="Complete"
              severity="success"
              icon="pi pi-check"
              :disabled="!canComplete"
              @click="completeWizard" />
          </div>
        </StepPanel>
      </StepPanels>
    </Stepper>
  </div>
</template>
