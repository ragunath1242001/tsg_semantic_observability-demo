<script setup lang="ts">
import { ref, toRefs } from "vue";
import { PolicyDto, type CatalogDto, type DatasetDto } from "@tsg-dsp/common";
import { JsonTreeView } from "json-tree-view-vue3";
import { injectStrict } from "../utils/injectTyped";
import utils from "../utils/common";
import { AxiosKey } from "../utils/symbols";
import { useToast } from "primevue/usetoast";

import Dataset from "../components/Dataset.vue";

const props = defineProps<{
  catalog: CatalogDto;
  url: string;
  assigner: string;
  type: "provider" | "consumer";
}>();

const parsedView = ref(true);
const policy = ref("");
var datasetView = ref(false);
var datasetData = ref<DatasetDto>();

const { catalog, url, assigner } = toRefs(props);
console.log(catalog.value);
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
    policy.value = createPolicy(datasetData.value["odrl:hasPolicy"][0]);
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
  return `mr-2 bg-${calculateColor(index)}-100 text-${calculateColor(
    index
  )}-700`;
};
const calculateIconBg = (index: number) => {
  return `p-button p-component p-button-icon-only p-button-rounded flex-shrink-0 w-5rem h-5rem bg-${calculateColor(
    index
  )}-100`;
};

const calculateIconClass = (index: number) => {
  return `pi pi-file text-${calculateColor(index)}-500`;
};

const createPolicy = (policy: PolicyDto): string => {
  const offer = {
    ...policy,
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "odrl:Offer",
    "@id": `urn:uuid:${crypto.randomUUID()}`,
    "odrl:assigner": assigner.value,
  };
  return JSON.stringify(offer, null, 2);
};
</script>
<template>
  <div class="grid card-container">
    <div class="col-12">
      <div class="card" v-if="!datasetView">
        <div class="flex align-items-center mb-4 gap-2">
          <label>Parsed View </label><InputSwitch v-model="parsedView" />
        </div>
        <JsonTreeView
          v-if="!parsedView"
          :data="JSON.stringify(catalog)"
          :maxDepth="3"
          color-scheme="dark"
          rootKey="Catalog"
        />
        <div class="grid" v-if="parsedView">
          <div class="col">
            <h5>{{ catalog["dct:title"] }}</h5>
            <p style="white-space: pre">
              {{ utils.obtainValues(catalog["dct:description"]).join("\r\n") }}
            </p>
            <p v-if="utils.obtainValues(catalog['dcat:keyword']).length > 0">
              <b>Keywords </b>
            </p>
            <Tag
              class="mr-2 bg-primary-700"
              v-for="keyword in utils.obtainValues(catalog['dcat:keyword'])"
              :key="keyword"
              :value="keyword"
            ></Tag>
          </div>
          <div class="col">
            <p v-if="catalog['dct:publisher']">
              <b>Publisher</b> {{ catalog["dct:publisher"] }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <template v-if="!datasetView && parsedView && datasetList">
      <div
        class="col-12 lg:col-6 xl:col-3"
        v-for="(dataset, index) in datasetList"
        :key="dataset['@id']"
      >
        <Card
          style="border-radius: 12px; border: 1px solid var(--surface-border)"
        >
          <template #title>{{ dataset["dct:title"] }}</template>
          <template #content>
            <p style="white-space: pre">
              {{ utils.obtainValues(dataset["dct:description"]).join("\r\n") }}
            </p>
            <div class="flex flex-wrap justify-content-center gap-3">
              <button
                :class="calculateIconBg(index)"
                type="button"
                @click="getDataset(dataset['@id'])"
              >
                <i
                  :class="calculateIconClass(index)"
                  style="font-size: 2.5rem"
                ></i>
              </button>
            </div>
            <div class="pt-1 pb-1"><b>Keywords </b></div>
            <Tag
              :class="calculateTagClass(index)"
              v-for="keyword in utils.obtainValues(dataset['dcat:keyword'])"
              :key="keyword"
              :value="keyword"
            ></Tag>
          </template>
          <template #footer>
            <div class="flex align-items-center justify-content-between">
              <span class="font-semibold"
                >Policies: {{ dataset["odrl:hasPolicy"]?.length ?? 0 }}</span
              >
              <Button
                icon="pi pi-trash"
                @click="deleteDataset(dataset['@id'])"
                size="large"
                severity="danger"
                rounded
                outlined
              />
            </div>
          </template>
        </Card>
      </div>
    </template>
    <template v-else-if="parsedView && !datasetList">
      <div class="col-12 lg:col-6 xl:col-3">
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
      :dataset-data="datasetData"
      :policy="policy"
      :address="url"
      :didId="catalog['dct:publisher']"
      :datasetView="datasetView"
      :type="props.type"
      @change-dataset-view="closeDatasetView"
      @update-datasets="updateDatasets"
    ></Dataset>
  </div>
</template>
