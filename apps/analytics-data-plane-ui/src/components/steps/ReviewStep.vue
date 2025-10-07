<script setup lang="ts">
import { computed } from "vue";

import {
  DATA_QUALITY_CONFIG,
  findOptionLabel,
  POPULATION_COVERAGE_EXTENDED_OPTIONS,
  POPULATION_COVERAGE_OPTIONS
} from "../../config/metadata-wizard.constants";
import type { ExtendedDataset } from "../../services/DatasetService";

interface Props {
  dataset: ExtendedDataset;
  isFairDataPoint: boolean;
  includeSampleData: boolean;
}

const props = defineProps<Props>();

const conformsToValue = computed(() =>
  Array.isArray(props.dataset.conformsTo)
    ? props.dataset.conformsTo[0] || ""
    : props.dataset.conformsTo || ""
);

const displayAccessServiceEndpointURL = computed(() => {
  const accessService = props.dataset.distribution?.[0]?.accessService;
  if (typeof accessService === "object" && accessService !== null) {
    return accessService.endpointURL || "";
  }
  return "";
});

const populationCoverageDisplay = computed(() => {
  const coverage = props.dataset["healthdcatap:populationCoverage"];
  if (!coverage) return "";

  if (coverage.includes("|")) {
    const [basic, extended] = coverage.split("|");
    const basicLabel = findOptionLabel(POPULATION_COVERAGE_OPTIONS, basic);
    const extendedLabel = findOptionLabel(
      POPULATION_COVERAGE_EXTENDED_OPTIONS,
      extended
    );
    return `${basicLabel} / ${extendedLabel}`;
  } else {
    return findOptionLabel(POPULATION_COVERAGE_OPTIONS, coverage);
  }
});

const getDataQualityLabel = (
  dimension: keyof typeof DATA_QUALITY_CONFIG,
  value: string
) => {
  return findOptionLabel(DATA_QUALITY_CONFIG[dimension], value);
};
</script>

<template>
  <div class="flex flex-col gap-6" style="min-height: 16rem">
    <div class="text-center">
      <h3 class="text-xl font-semibold mb-2">Review & Complete</h3>
      <p class="text-gray-600">
        Review your metadata and complete the dataset creation
      </p>
    </div>

    <div class="space-y-6">
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-info-circle"></i>
            Basic Information
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="dataset.title">
              <strong>Title:</strong>
              {{ dataset.title }}
            </div>
            <div v-if="dataset['@id']">
              <strong>Identifier:</strong>
              {{ dataset["@id"] }}
            </div>
            <div v-if="dataset.description?.[0]" class="md:col-span-2">
              <strong>Description:</strong>
              {{ dataset.description[0] }}
            </div>
            <div v-if="dataset.keyword?.length" class="md:col-span-2">
              <strong>Keywords:</strong>
              <div class="flex gap-2 flex-wrap mt-1">
                <Tag
                  v-for="keyword in dataset.keyword"
                  :key="keyword"
                  :value="keyword" />
              </div>
            </div>
            <div v-if="conformsToValue">
              <strong>Conforms To:</strong>
              {{ conformsToValue }}
            </div>
          </div>
        </template>
      </Card>

      <Card
        v-if="
          isFairDataPoint ||
          dataset['healthdcatap:numberOfRecords'] ||
          dataset['healthdcatap:numberOfUniqueIndividuals'] ||
          dataset['healthdcatap:healthTheme']?.length ||
          dataset['healthdcatap:hasCodingSystem']?.length ||
          populationCoverageDisplay
        ">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-heart"></i>
            Health & Research
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="dataset['healthdcatap:numberOfRecords']">
              <strong>Number of Records:</strong>
              {{ dataset["healthdcatap:numberOfRecords"] }}
            </div>
            <div v-if="dataset['healthdcatap:numberOfUniqueIndividuals']">
              <strong>Number of Unique Individuals:</strong>
              {{ dataset["healthdcatap:numberOfUniqueIndividuals"] }}
            </div>
            <div v-if="populationCoverageDisplay">
              <strong>Population Coverage:</strong>
              {{ populationCoverageDisplay }}
            </div>
            <div
              v-if="dataset['healthdcatap:healthTheme']?.length"
              class="md:col-span-2">
              <strong>Health Themes:</strong>
              <div class="flex gap-2 flex-wrap mt-1">
                <Tag
                  v-for="theme in dataset['healthdcatap:healthTheme']"
                  :key="theme"
                  :value="theme" />
              </div>
            </div>
            <div
              v-if="dataset['healthdcatap:hasCodingSystem']?.length"
              class="md:col-span-2">
              <strong>Coding Systems:</strong>
              <div class="flex gap-2 flex-wrap mt-1">
                <Tag
                  v-for="system in dataset['healthdcatap:hasCodingSystem']"
                  :key="system"
                  :value="system" />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <Card
        v-if="
          dataset['dqv:hasQualityAnnotation']?.['dqv:averageTime'] ||
          dataset['dqv:accuracy'] ||
          dataset['dqv:coherence'] ||
          dataset['dqv:completeness'] ||
          dataset['dqv:consistency'] ||
          dataset['dqv:precision'] ||
          dataset['dqv:validity']
        ">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-shield"></i>
            Data Quality
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 gap-4">
            <div
              v-if="dataset['dqv:hasQualityAnnotation']?.['dqv:averageTime']">
              <strong>Average Time from Data Access to Data Release:</strong>
              {{ dataset["dqv:hasQualityAnnotation"]["dqv:averageTime"] }}
            </div>
            <div v-if="dataset['dqv:accuracy']">
              <strong>Accuracy:</strong>
              {{ getDataQualityLabel("accuracy", dataset["dqv:accuracy"]) }}
            </div>
            <div v-if="dataset['dqv:coherence']">
              <strong>Coherence:</strong>
              {{ getDataQualityLabel("coherence", dataset["dqv:coherence"]) }}
            </div>
            <div v-if="dataset['dqv:completeness']">
              <strong>Completeness:</strong>
              {{
                getDataQualityLabel("completeness", dataset["dqv:completeness"])
              }}
            </div>
            <div v-if="dataset['dqv:consistency']">
              <strong>Consistency:</strong>
              {{
                getDataQualityLabel("consistency", dataset["dqv:consistency"])
              }}
            </div>
            <div v-if="dataset['dqv:precision']">
              <strong>Precision:</strong>
              {{ getDataQualityLabel("precision", dataset["dqv:precision"]) }}
            </div>
            <div v-if="dataset['dqv:validity']">
              <strong>Validity:</strong>
              {{ getDataQualityLabel("validity", dataset["dqv:validity"]) }}
            </div>
          </div>
        </template>
      </Card>

      <Card
        v-if="
          dataset.distribution?.[0]?.title ||
          dataset.distribution?.[0]?.format ||
          displayAccessServiceEndpointURL ||
          dataset.hasPolicy?.[0]?.assigner ||
          dataset.hasPolicy?.[0]?.permission?.[0]?.action ||
          (includeSampleData &&
            (dataset['adms:sample']?.description?.[0] ||
              dataset['adms:sample']?.['dcat:downloadURL'] ||
              dataset['adms:sample']?.['dcat:mediaType']))
        ">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-share-alt"></i>
            Distribution & Access
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="dataset.distribution?.[0]?.title">
              <strong>Distribution Title:</strong>
              {{ dataset.distribution[0].title }}
            </div>
            <div v-if="dataset.distribution?.[0]?.format">
              <strong>Distribution Format:</strong>
              {{ dataset.distribution[0].format }}
            </div>
            <div
              v-if="dataset.distribution[0].conformsTo"
              class="md:col-span-2">
              <strong>CSVW Reference:</strong>
              {{ dataset.distribution[0].conformsTo[0] }}
            </div>
            <div v-if="displayAccessServiceEndpointURL" class="md:col-span-2">
              <strong>Access Service Endpoint URL:</strong>
              {{ displayAccessServiceEndpointURL }}
            </div>
            <div v-if="dataset.hasPolicy?.[0]?.assigner">
              <strong>Policy Assigner:</strong>
              {{ dataset.hasPolicy[0].assigner }}
            </div>
            <div v-if="dataset.hasPolicy?.[0]?.permission?.[0]?.action">
              <strong>Policy Permission Action:</strong>
              {{ dataset.hasPolicy[0].permission[0].action }}
            </div>
            <!-- Sample Data Fields -->
            <template v-if="includeSampleData">
              <div
                v-if="dataset['adms:sample']?.description?.[0]"
                class="md:col-span-2 border-t pt-3 mt-3">
                <strong>Sample Dataset Description:</strong>
                {{ dataset["adms:sample"].description[0] }}
              </div>
              <div v-if="dataset['adms:sample']?.['dcat:downloadURL']">
                <strong>Sample Download URL:</strong>
                {{ dataset["adms:sample"]["dcat:downloadURL"] }}
              </div>
              <div v-if="dataset['adms:sample']?.['dcat:mediaType']">
                <strong>Sample Media Type:</strong>
                {{ dataset["adms:sample"]["dcat:mediaType"] }}
              </div>
            </template>
          </div>
        </template>
      </Card>

      <Card
        v-if="
          dataset['dpv:hasLegalBasis'] ||
          dataset['prov:wasGeneratedBy']?.['prov:actedOnBehalfOf'] ||
          dataset['prov:wasGeneratedBy']?.['prov:endedAtTime']
        ">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-check-square"></i>
            Legal & Compliance
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="dataset['dpv:hasLegalBasis']">
              <strong>Legal Basis:</strong>
              {{ dataset["dpv:hasLegalBasis"] }}
            </div>
            <div
              v-if="dataset['prov:wasGeneratedBy']?.['prov:actedOnBehalfOf']">
              <strong>Acting on Behalf Of:</strong>
              {{ dataset["prov:wasGeneratedBy"]["prov:actedOnBehalfOf"] }}
            </div>
            <div
              v-if="dataset['prov:wasGeneratedBy']?.['prov:endedAtTime']"
              class="md:col-span-2">
              <strong>Data Generation End Time:</strong>
              {{
                new Date(
                  dataset["prov:wasGeneratedBy"]["prov:endedAtTime"]
                ).toLocaleString()
              }}
            </div>
          </div>
        </template>
      </Card>

      <Card
        v-if="!dataset.title && !dataset.description?.[0]"
        class="border-orange-200">
        <template #content>
          <div class="text-center text-orange-600">
            <i class="pi pi-exclamation-triangle text-2xl mb-2"></i>
            <p class="font-semibold">No metadata has been entered</p>
            <p class="text-sm">
              Please go back and fill in at least the basic information before
              completing.
            </p>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
