<script setup lang="ts">
import {
  type CatalogDto,
  type DatasetDto,
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
const datasetList = ref(catalog.value["dcat:dataset"]);
const datasetVersionList = computed(() => {
  return datasetList.value
    .filter((dataset) => !dataset["dcat:isVersionOf"])
    .map((rootDataset) => {
      return {
        root: rootDataset,
        current: rootDataset["dcat:hasCurrentVersion"]
          ? datasetList.value.filter(
              (dataset) =>
                dataset["@id"] === rootDataset["dcat:hasCurrentVersion"]
            )[0]
          : rootDataset,
        versions: datasetList.value.filter(
          (dataset) => dataset["dcat:isVersionOf"] === rootDataset["@id"]
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
        audience: catalog.value["dct:publisher"]
      }
    });
    datasetData.value = response.data;
    if (datasetData.value?.["odrl:hasPolicy"]) {
      policy.value = createPolicy(datasetData.value?.["odrl:hasPolicy"]?.[0]);
    }
    datasetView.value = true;
    return datasetData;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to send dataset request",
        defaultMessage: `Could not retrieve dataset with id ${datasetId} at ${url.value} with audience ${catalog.value["dct:publisher"]}`
      })
    );
  }
};

const updateDatasets = (dataset: DatasetDto) => {
  const indexToBeReplaced = datasetList.value.findIndex(
    (ds) => ds["@id"] === dataset["@id"]
  );
  datasetList.value[indexToBeReplaced] = dataset;
  return;
};

const deleteDataset = async (datasetId: string) => {
  try {
    await http.delete(`management/catalog/dataset/${datasetId}`);
    datasetList.value = datasetList.value.filter((d) => d["@id"] !== datasetId);
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
  const offer = {
    ...policy,
    "@context": "https://w3id.org/dspace/2024/1/context.json",
    "@type": "odrl:Offer",
    "@id": `urn:uuid:${crypto.randomUUID()}`,
    "odrl:assigner": catalog.value["dct:publisher"]
  };
  return JSON.stringify(offer, null, 2);
};
</script>
<template>
  <div v-if="!datasetView && singleCatalog" class="col-span-12">
    <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
      <template #title>{{ catalog["dct:title"] }}</template>
      <template #subtitle>{{
        obtainValues(catalog["dct:description"]).join("\r\n")
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
          <DisplayField v-if="catalog['dct:publisher']" label="Publisher">{{
            catalog["dct:publisher"].replace("%3A", ":")
          }}</DisplayField>
          <DisplayField
            v-if="obtainValues(catalog['dcat:keyword']).length > 0"
            label="Keywords">
            <Tag
              v-for="keyword in obtainValues(catalog['dcat:keyword'])"
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
      <Card
        class="flex flex-col h-full"
        style="border-radius: 12px; border: 1px solid var(--surface-border)">
        <template #title>
          <div class="flex items-center">
            <span class="mr-2">
              <i class="pi pi-database text-xl text-primary-600"></i>
            </span>
            <div
              v-tooltip.top="dataset.root['dct:title']"
              class="bg-surface-0 dark:bg-surface-900 whitespace-nowrap overflow-hidden text-ellipsis">
              {{ dataset.root["dct:title"] }}
            </div>
          </div>
        </template>
        <template #subtitle>
          <div>
            {{ obtainValues(dataset.root["dct:description"]).join("\r\n") }}
          </div>
          <div v-if="!!dataset.current['dcat:version']">
            Current version: {{ dataset.current["dcat:version"] }}
          </div>
        </template>
        <template #content>
          <div style="min-height: 4em">
            <span class="font-semibold">
              Policies: {{ dataset.current["odrl:hasPolicy"]?.length ?? 0 }}
            </span>
            <div class="pt-4">
              <span class="font-semibold">References</span>
              <ul>
                <li v-if="dataset.versions.length === 0">
                  <Links
                    :url-array="dataset.current['dct:conformsTo']"
                    label="Model" />
                </li>
                <template v-else>
                  <li>
                    <Links
                      v-if="dataset.root['dct:conformsTo']"
                      :url-array="dataset.root['dct:conformsTo']"
                      label="Abstract model" />
                  </li>
                  <li>
                    <Links
                      :url-array="dataset.current['dct:conformsTo']"
                      label="Version model" />
                  </li>
                </template>
                <li>
                  <Links
                    :url-array="
                      dataset.current['dcat:distribution']?.[0]?.[
                        'dct:conformsTo'
                      ]
                    "
                    label="Format" />
                </li>
              </ul>
            </div>
          </div>
          <template v-if="dataset.current['dcat:keyword']">
            <div class="pt-4 pb-1 font-semibold">Keywords</div>
            <Tag
              v-for="keyword in obtainValues(dataset.current['dcat:keyword'])"
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
              <AccordionHeader class="font-semibold">
                All versions
              </AccordionHeader>
              <AccordionContent>
                <ul>
                  <li v-for="version in dataset.versions" :key="version['@id']">
                    <div>
                      {{
                        version["dcat:distribution"]?.[0]?.["dct:title"] ??
                        version["dct:title"]
                      }}
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
              {{ catalog["dct:title"] }}
            </span>
            <span class="flex-auto text-right">
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
      <Card
        style="border-radius: 12px; border: 1px solid var(--surface-border)">
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
    :did-id="catalog['dct:publisher']"
    :dataset-view="datasetView"
    :own-dataset="ownCatalog"
    @change-dataset-view="closeDatasetView"
    @update-datasets="updateDatasets"></Dataset>
</template>
