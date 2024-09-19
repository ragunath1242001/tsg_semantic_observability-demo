<script setup lang="ts">
import { ref, toRefs } from "vue";
import {
  PolicyDto,
  type CatalogDto,
  type DatasetDto,
} from "@tsg-dsp/common-dsp";
import { injectStrict } from "../utils/injectTyped";
import utils from "../utils/common";
import { AxiosKey } from "../utils/symbols";
import { useToast } from "primevue/usetoast";

import Dataset from "../components/Dataset.vue";
import DisplayField from "@tsg-dsp/common-ui/components/DisplayField.vue";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";

const props = defineProps<{
  catalog: CatalogDto;
  url: string;
  assigner?: string;
  singleCatalog: boolean;
  ownCatalog: boolean;
}>();

const parsedView = ref(true);
const policy = ref("");
var datasetView = ref(false);
var datasetData = ref<DatasetDto>();

const { catalog, url, assigner } = toRefs(props);
var datasetList = ref(catalog.value["dcat:dataset"]);

const http = injectStrict(AxiosKey);

const toast = useToast();

const getDataset = async (datasetId: String) => {
  try {
    const response = await http.get<DatasetDto>("management/catalog/dataset", {
      params: {
        address: url.value,
        id: datasetId,
        audience: catalog.value["dct:publisher"],
      },
    });
    datasetData.value = response.data;
    if (datasetData.value?.["odrl:hasPolicy"]) {
      policy.value = createPolicy(datasetData.value?.["odrl:hasPolicy"]?.[0]);
    }
    datasetView.value = true;
    return datasetData;
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Failed to send dataset request",
      detail: `${e.response.data.message}`,
      life: 3000,
    });
    console.error(
      `Could not retrieve dataset with id ${datasetId} at ${url.value} with audience ${catalog.value["dct:publisher"]}. Error: ${e}`
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
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Could not delete dataset",
      detail: `${e.response.data.message}`,
      life: 3000,
    });
  }
};

const closeDatasetView = () => {
  datasetView.value = false;
};

const calculateColor = (index: number) => {
  const colors = ["primary", "orange", "cyan", "purple"];
  return colors[index % 4];
};
const calculateTagClass = (index: number) => {
  return `mx-2 bg-${calculateColor(index)}-100 text-${calculateColor(
    index
  )}-700`;
};
const calculateIconBg = (index: number) => {
  return `inline-flex border-circle align-items-center justify-content-center bg-${calculateColor(
    index
  )}-100 mr-3`;
};

const calculateIconClass = (index: number) => {
  return `pi pi-file text-xl text-${calculateColor(index)}-600`;
};

const createPolicy = (policy: PolicyDto): string => {
  const offer = {
    ...policy,
    "@context": "https://w3id.org/dspace/2024/1/context.json",
    "@type": "odrl:Offer",
    "@id": `urn:uuid:${crypto.randomUUID()}`,
    "odrl:assigner": catalog.value['dct:publisher'],
  };
  return JSON.stringify(offer, null, 2);
};
</script>
<template>
  <div class="col-span-12" v-if="!datasetView && singleCatalog">
    <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
      <template #title>{{ catalog["dct:title"] }}</template>
      <template #subtitle>{{
        utils.obtainValues(catalog["dct:description"]).join("\r\n")
      }}</template>
      <template #content>
        <FormField label="Parsed View">
          <ToggleSwitch v-model="parsedView" />
        </FormField>
        <MonacoEditorVue
          v-if="!parsedView"
          :static="catalog"
          :read-only="true"
          :max-lines="30"
        />
        <div class="grid grid-cols-12 gap-4" v-if="parsedView">
          <DisplayField label="Publisher" v-if="catalog['dct:publisher']">{{
            catalog["dct:publisher"].replace("%3A", ":")
          }}</DisplayField>
          <DisplayField
            label="Keywords"
            v-if="utils.obtainValues(catalog['dcat:keyword']).length > 0"
          >
            <Tag
              class="mr-2 bg-primary-700"
              v-for="keyword in utils.obtainValues(catalog['dcat:keyword'])"
              :key="keyword"
              :value="keyword"
            ></Tag>
          </DisplayField>
        </div>
      </template>
    </Card>
  </div>
  <template v-if="!datasetView && parsedView && datasetList">
    <div
      class="col-span-12 lg:col-span-6 xl:col-span-3"
      v-for="(dataset, index) in datasetList"
      :key="dataset['@id']"
    >
      <Card
        class="flex flex-col h-full"
        style="border-radius: 12px; border: 1px solid var(--surface-border)"
      >
        <template #title>
          <div class="flex items-center">
            <span class="mr-2">
              <i :class="calculateIconClass(index)"></i>
            </span>
            <div
              class="bg-surface-0 dark:bg-surface-900 whitespace-nowrap overflow-hidden text-ellipsis"
              v-tooltip.top="dataset['dct:title']"
            >
              {{ dataset["dct:title"] }}
            </div>
          </div>
        </template>
        <template #subtitle>
          {{ utils.obtainValues(dataset["dct:description"]).join("\r\n") }}
        </template>
        <template #content>
          <div style="min-height: 4em">
            <span class="font-semibold">
              Policies: {{ dataset["odrl:hasPolicy"]?.length ?? 0 }}
            </span>
            <template v-if="dataset['dct:conformsTo']">
              <div class="pt-4 pb-1 font-semibold">
                Conforms To:
                <a v-for="conformsTo in dataset['dct:conformsTo']" :href="conformsTo" target="_blank" class="mr-2">
                  <i
                    class="mx-1 pi pi-link text-blue-500"
                    v-tooltip.bottom="conformsTo"
                  >
                  </i>
                </a>
              </div>
            </template>
            <template v-if="dataset['dcat:keyword']">
              <div class="pt-4 pb-1 font-semibold">Keywords</div>
              <Tag
                :class="calculateTagClass(index)"
                v-for="keyword in utils.obtainValues(dataset['dcat:keyword'])"
                :key="keyword"
                :value="keyword"
              ></Tag>
            </template>
          </div>
        </template>
        <template style="justify-content: flex-end" #footer>
          <div class="flex items-center card-footer justify-between">
            <Button
              icon="pi pi-trash"
              v-if="ownCatalog"
              @click="deleteDataset(dataset['@id'])"
              severity="danger"
              class="shadow-lg"
              rounded
              outlined
            />
            <span class="p-card-subtitle mb-0" v-if="!ownCatalog">
              {{ catalog["dct:title"] }}
            </span>
            <Button
              icon="pi pi-external-link"
              rounded
              outlined
              class="shadow-lg"
              @click="getDataset(dataset['@id'])"
            ></Button>
          </div>
        </template>
      </Card>
    </div>
  </template>

  <template v-else-if="parsedView && !datasetList && singleCatalog">
    <div class="col-span-12 lg:col-span-6 xl:col-span-3 mt-8">
      <Card
        style="border-radius: 12px; border: 1px solid var(--surface-border)"
      >
        <template #title>Empty Catalog.</template>
        <template #content>
          <p>No datasets were found in this catalog.</p>
        </template>
      </Card>
    </div>
  </template>
  <Dataset
    v-if="datasetView"
    :dataset-data="datasetData"
    :policy="policy"
    :address="url"
    :didId="catalog['dct:publisher']"
    :datasetView="datasetView"
    :ownDataset="ownCatalog"
    @change-dataset-view="closeDatasetView"
    @update-datasets="updateDatasets"
  ></Dataset>
</template>
