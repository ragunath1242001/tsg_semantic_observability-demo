<script setup lang="ts">
import {
  type CatalogDto,
  type DatasetDto,
  defaultContext,
  OfferDto,
  PolicyDto
} from "@tsg-dsp/common-dsp";
import DisplayField from "@tsg-dsp/common-ui/components/DisplayField.vue";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { obtainValues } from "@tsg-dsp/common-ui/utils/common";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { useToast } from "primevue/usetoast";
import { computed, ref, toRefs } from "vue";

import Dataset from "../components/Dataset.vue";
import Links from "../components/Links.vue";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";

const props = defineProps<{
  catalog: CatalogDto;
  url: string;
  assigner?: string;
  singleCatalog: boolean;
  ownCatalog: boolean;
}>();

const parsedView = ref(true);
const policy = ref("");
const datasetView = ref(false);
const datasetData = ref<DatasetDto>();

const { catalog, url } = toRefs(props);
const datasetList = computed(() => catalog.value.dataset || []);
const datasetVersionList = computed(() => {
  return datasetList.value
    .filter((dataset) => !dataset.isVersionOf)
    .map((rootDataset) => {
      return {
        root: rootDataset,
        current: rootDataset.hasCurrentVersion
          ? datasetList.value.filter(
              (dataset) => dataset["@id"] === rootDataset.hasCurrentVersion
            )[0]
          : rootDataset,
        versions: datasetList.value.filter(
          (dataset) => dataset.isVersionOf === rootDataset["@id"]
        )
      };
    });
});

const http = injectStrict(AxiosKey);

const toast = useToast();

const getDataset = async (datasetId: string) => {
  try {
    const response = await http.get<DatasetDto>("management/catalog/dataset", {
      params: {
        address: url.value,
        id: datasetId,
        audience: catalog.value.publisher
      }
    });
    datasetData.value = response.data;
    if (datasetData.value?.hasPolicy) {
      policy.value = createPolicy(datasetData.value?.hasPolicy?.[0]);
    }
    datasetView.value = true;
    return datasetData;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to send dataset request",
        defaultMessage: `Could not retrieve dataset with id ${datasetId} at ${url.value} with audience ${catalog.value.publisher}`
      })
    );
  }
};

const updateDatasets = (dataset: DatasetDto) => {
  const indexToBeReplaced = catalog.value.dataset?.findIndex(
    (ds) => ds["@id"] === dataset["@id"]
  );
  if (
    indexToBeReplaced !== undefined &&
    indexToBeReplaced >= 0 &&
    catalog.value.dataset
  ) {
    catalog.value.dataset[indexToBeReplaced] = dataset;
  }
  return;
};

const deleteDataset = async (datasetId: string) => {
  try {
    await http.delete(`management/catalog/dataset/${datasetId}`);
    if (catalog.value.dataset) {
      catalog.value.dataset = catalog.value.dataset.filter(
        (d) => d["@id"] !== datasetId
      );
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not delete dataset",
        defaultMessage: "Could not delete dataset at the control plane"
      })
    );
  }
};

const closeDatasetView = () => {
  datasetView.value = false;
};

const createPolicy = (policy: PolicyDto): string => {
  const offer: OfferDto = {
    ...policy,
    "@context": defaultContext(),
    "@type": "Offer",
    "@id": `urn:uuid:${crypto.randomUUID()}`,
    assigner: catalog.value.publisher
  };
  return JSON.stringify(offer, null, 2);
};

const openLandingPage = (landingPageUrl: string) => {
  window.open(landingPageUrl, "_blank");
};

const getFormatInfo = (dataset: DatasetDto) => {
  const format = dataset.distribution?.[0]?.format?.toLowerCase() || "";

  if (format === "tsg:analytics" && !dataset.distribution?.[0]?.byteSize) {
    return {
      icon: "pi pi-chart-bar",
      color: "bg-violet-100 text-violet-700",
      label: "Analytics"
    };
  } else if (format === "tsg:http") {
    return {
      icon: "pi pi-globe",
      color: "bg-blue-100 text-blue-700",
      label: "HTTP"
    };
  }

  return { icon: "pi-file", color: "bg-gray-100 text-gray-700", label: "Data" };
};
</script>
<template>
  <div v-if="!datasetView && singleCatalog" class="col-span-12">
    <Card>
      <template #title>{{ catalog.title }}</template>
      <template #subtitle>{{
        obtainValues(catalog.description).join("\r\n")
      }}</template>
      <template #content>
        <FormField label="Parsed View">
          <ToggleSwitch v-model="parsedView" />
        </FormField>
        <MonacoEditorVue
          v-if="!parsedView"
          :static="catalog"
          :read-only="true"
          :max-lines="30" />
        <div v-if="parsedView" class="grid grid-cols-12 gap-4">
          <DisplayField v-if="catalog.publisher" label="Publisher">{{
            catalog.publisher.replace("%3A", ":")
          }}</DisplayField>
          <DisplayField
            v-if="obtainValues(catalog.keyword).length > 0"
            label="Keywords">
            <Tag
              v-for="keyword in obtainValues(catalog.keyword)"
              :key="keyword"
              class="mr-2 bg-primary-700"
              :value="keyword"></Tag>
          </DisplayField>
        </div>
      </template>
    </Card>
  </div>
  <template v-if="!datasetView && parsedView && datasetList">
    <div
      v-for="dataset in datasetVersionList"
      :key="dataset.root['@id']"
      class="col-span-12 lg:col-span-6 xl:col-span-3">
      <Card class="flex flex-col h-full">
        <template #title>
          <div class="flex items-center">
            <span class="mr-2">
              <i class="pi pi-database text-xl text-primary-600"></i>
            </span>
            <div
              v-tooltip.top="dataset.root.title"
              class="whitespace-nowrap overflow-hidden text-ellipsis">
              {{ dataset.root.title }}
            </div>
          </div>
        </template>
        <template #subtitle>
          <div class="flex items-start align-center justify-between gap-2 mb-2">
            <div
              v-if="!!dataset.current.version"
              class="inline-flex items-center gap-1">
              <i class="pi pi-tag text-sm"></i>
              <span class="text-sm font-medium"
                >Current version: v{{ dataset.current.version }}</span
              >
            </div>
            <div class="text-sm leading-relaxed flex-1 min-w-0">
              {{ obtainValues(dataset.root.description).join("\r\n") }}
            </div>
            <div class="flex-shrink-0">
              <div
                v-tooltip.top="
                  `Format: ${getFormatInfo(dataset.current).label}`
                "
                :class="`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getFormatInfo(dataset.current).color}`">
                <i
                  :class="`${getFormatInfo(dataset.current).icon} mr-1 text-xs`"></i>
                <span class="hidden sm:inline">{{
                  getFormatInfo(dataset.current).label
                }}</span>
              </div>
            </div>
          </div>
        </template>
        <template #content>
          <div class="space-y-4 py-2" style="min-height: 4em">
            <div class="flex items-center gap-1">
              <i class="pi pi-shield text-sm"></i>
              <span class="text-sm">
                <span class="font-medium">{{
                  dataset.current.hasPolicy?.length ?? 0
                }}</span>
                Policies
              </span>
            </div>

            <div>
              <div class="flex items-center gap-1 mb-2">
                <i class="pi pi-link text-sm"></i>
                <span class="text-sm font-medium">References</span>
              </div>
              <ul class="ml-5 space-y-1">
                <li v-if="dataset.versions.length === 0">
                  <Links
                    :url-array="dataset.current.conformsTo"
                    label="Model" />
                </li>
                <template v-else>
                  <li>
                    <Links
                      v-if="dataset.root.conformsTo"
                      :url-array="dataset.root.conformsTo"
                      label="Abstract model" />
                  </li>
                  <li>
                    <Links
                      :url-array="dataset.current.conformsTo"
                      label="Version model" />
                  </li>
                </template>
                <li>
                  <Links
                    :url-array="dataset.current.distribution?.[0]?.conformsTo"
                    label="Format" />
                </li>
              </ul>
            </div>
          </div>
          <template v-if="dataset.current.keyword">
            <div class="pt-4 pb-1 font-semibold">Keywords</div>
            <Tag
              v-for="keyword in obtainValues(dataset.current.keyword)"
              :key="keyword"
              class="mr-1"
              :value="keyword"
              severity="secondary"
              rounded></Tag>
          </template>
          <Accordion
            v-if="dataset.versions.length > 0"
            class="pt-4"
            value=""
            unstyled>
            <AccordionPanel value="0">
              <AccordionHeader class="text-sm font-medium">
                <i class="pi pi-history text-xs mr-1"></i>
                All versions
              </AccordionHeader>
              <AccordionContent>
                <ul>
                  <li v-for="version in dataset.versions" :key="version['@id']">
                    <div>
                      {{ version.distribution?.[0]?.title ?? version.title }}
                      <i
                        v-if="version['@id'] !== dataset.current['@id']"
                        class="mx-1 pi pi-trash text-red-500 cursor-pointer"
                        @click="deleteDataset(version['@id'])"></i>
                      <i v-else class="mx-1 pi pi-trash text-blue-200"></i>
                      <i
                        class="mx-1 pi pi-info-circle text-blue-500 cursor-pointer"
                        @click="getDataset(version['@id'])">
                      </i>
                    </div>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </template>
        <template #footer>
          <div class="flex items-center card-footer justify-right">
            <span v-if="!ownCatalog" class="flex-auto p-card-subtitle mb-0">
              {{ catalog.title }}
            </span>
            <span class="flex-auto text-right">
              <Button
                v-if="dataset.current.landingPage"
                v-tooltip.top="'Visit Landing Page'"
                icon="pi pi-external-link"
                rounded
                outlined
                class="shadow-lg mr-2"
                @click="openLandingPage(dataset.current.landingPage)"></Button>
              <Button
                icon="pi pi-info"
                rounded
                outlined
                class="shadow-lg"
                @click="getDataset(dataset.current['@id'])"></Button>
            </span>
          </div>
        </template>
      </Card>
    </div>
  </template>

  <template v-else-if="parsedView && !datasetList && singleCatalog">
    <div class="col-span-12 lg:col-span-6 xl:col-span-3 mt-8">
      <Card>
        <template #title>Empty Catalog.</template>
        <template #content>
          <p>No datasets were found in this catalog.</p>
        </template>
      </Card>
    </div>
  </template>
  <Dataset
    v-if="datasetView"
    :dataset-data-prop="datasetData"
    :policy="policy"
    :address="url"
    :did-id="catalog.publisher"
    :dataset-view="datasetView"
    :own-dataset="ownCatalog"
    @change-dataset-view="closeDatasetView"
    @update-datasets="updateDatasets"></Dataset>
</template>
