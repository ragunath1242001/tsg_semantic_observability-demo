<script setup lang="ts">
import { computed, ref, toRefs } from "vue";
import {
  PolicyDto,
  type CatalogDto,
  type DatasetDto,
} from "@tsg-dsp/common-dsp";
import { injectStrict } from "../utils/injectTyped";
import utils from "../utils/common";
import { AxiosKey } from "../utils/symbols";
import { useToast } from "primevue/usetoast";

import Links from "../components/Links.vue";
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
var datasetVersionList = computed(() => {
  return datasetList.value
    .filter((dataset) => !dataset["dcat:isVersionOf"])
    .map((rootDataset) => {
      return {
        root: rootDataset,
        current: !!rootDataset["dcat:hasCurrentVersion"]
          ? datasetList.value.filter(
              (dataset) =>
                dataset["@id"] === rootDataset["dcat:hasCurrentVersion"]["@id"]
            )[0]
          : rootDataset,
        versions: datasetList.value.filter(
          (dataset) =>
            dataset["dcat:isVersionOf"]?.["@id"] === rootDataset["@id"]
        ),
      };
    });
});

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

const createPolicy = (policy: PolicyDto): string => {
  const offer = {
    ...policy,
    "@context": "https://w3id.org/dspace/2024/1/context.json",
    "@type": "odrl:Offer",
    "@id": `urn:uuid:${crypto.randomUUID()}`,
    "odrl:assigner": catalog.value["dct:publisher"],
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
      v-for="(dataset, index) in datasetVersionList"
      :key="dataset.root['@id']"
    >
      <Card
        class="flex flex-col h-full"
        style="border-radius: 12px; border: 1px solid var(--surface-border)"
      >
        <template #title>
          <div class="flex items-center">
            <span class="mr-2">
              <i class="pi pi-database text-xl text-primary-600"></i>
            </span>
            <div
              class="bg-surface-0 dark:bg-surface-900 whitespace-nowrap overflow-hidden text-ellipsis"
              v-tooltip.top="dataset.root['dct:title']"
            >
              {{ dataset.root["dct:title"] }}
            </div>
          </div>
        </template>
        <template #subtitle>
          <div>
            {{
              utils.obtainValues(dataset.root["dct:description"]).join("\r\n")
            }}
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
                <li>
                  <Links
                    v-if="dataset.root['dct:conformsTo']"
                    :urlArray="dataset.root['dct:conformsTo']"
                    label="Abstract model"
                  />
                </li>
                <li>
                  <Links
                    :urlArray="dataset.current['dct:conformsTo']"
                    label="Version model"
                  />
                </li>
                <li>
                  <Links
                    :urlArray="
                      dataset.current['dcat:distribution']?.[0]?.[
                        'dct:conformsTo'
                      ]
                    "
                    label="Format"
                  />
                </li>
              </ul>
            </div>
          </div>
          <template v-if="dataset.current['dcat:keyword']">
            <div class="pt-4 pb-1 font-semibold">Keywords</div>
            <Tag
              class="mr-1"
              v-for="keyword in utils.obtainValues(
                dataset.current['dcat:keyword']
              )"
              :key="keyword"
              :value="keyword"
              severity="secondary"
              rounded
            ></Tag>
          </template>
          <Accordion
            class="pt-4"
            v-if="dataset.versions.length > 0"
            value=""
            unstyled
          >
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
                        class="mx-1 pi pi-trash text-red-500 cursor-pointer"
                        v-if="version['@id'] !== dataset.current['@id']"
                        @click="deleteDataset(version['@id'])"
                      ></i>
                      <i class="mx-1 pi pi-trash text-blue-200" v-else></i>
                      <i
                        class="mx-1 pi pi-info-circle text-blue-500 cursor-pointer"
                        @click="getDataset(version['@id'])"
                      >
                      </i>
                    </div>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </template>
        <template style="justify-content: flex-end" #footer>
          <div class="flex items-center card-footer justify-right">
            <span class="p-card-subtitle mb-0" v-if="!ownCatalog">
              {{ catalog["dct:title"] }}
            </span>
            <Button
              icon="pi pi-info"
              rounded
              outlined
              class="shadow-lg"
              @click="getDataset(dataset.current['@id'])"
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
