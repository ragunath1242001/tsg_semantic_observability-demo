<script setup lang="ts">
import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import { CatalogDto, DatasetDto } from "@tsg-dsp/common-dsp";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";
import Catalog from "../components/Catalog.vue";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import router from "../router";
import { useCatalogStore } from "../stores/catalog";
import { storeToRefs } from "pinia";
import utils from "../utils/common";

var catalog = ref<CatalogDto>();
var addresses = ref<string[]>();
var selection = ref<CredentialAddress>(null);
var assigner = ref("");

const catalogs = ref<CatalogDto[]>();

const toast = useToast();
const http = injectStrict(AxiosKey);
const { urlInput, didInput } = storeToRefs(useCatalogStore());

const queryAddresses = async () => {
  try {
    const response = await http.get(`registry/addresses`);
    addresses.value = response.data;
    return addresses;
  } catch (error) {
    // Handle error
    console.error("Error:", error);
    toast.add({
      severity: "error",
      summary: "Failed to retrieve addresses",
      life: 3000,
      detail: `${error.response.data.message}`,
    });
    throw error;
  }
};

const getCatalog = () => {
  urlInput.value = selection.value.address;
  didInput.value = selection.value.didId;
  router.push({ path: "/catalog/request" });
};

const getCatalogs = async () => {
  try {
    const response = await http.get<CatalogDto[]>(
      "management/registry/catalogs"
    );
    catalogs.value = response.data;
    return catalogs;
  } catch (error) {
    console.error("Error:", error);
    toast.add({
      severity: "error",
      summary: "Failed to retrieve catalogs",
      life: 3000,
      detail: `${error.response.data.message}`,
    });
    throw error;
  }
};

const initialize = async () => {
  getCatalogs();
  queryAddresses();
};

onMounted(async () => await initialize());
</script>
<template>
  <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>Registry</template>
    <template #content
      >Use this page to find other participants in the dataspace. It sets you up
      for the browsing of the catalog and start the processes of the Dataspace
      Protocol.
    </template>
  </Card>
  <Card
    style="border-radius: 12px; border: 1px solid var(--surface-border)"
    class="mt-8"
  >
    <template #title>Addresses</template>
    <template #subtitle
      >Overview of all participants in the dataspace. Click an entry to request
      their catalog.</template
    >
    <template #content>
      <DataTable
        :value="addresses"
        v-model:selection="selection"
        selectionMode="single"
        :paginator="true"
        :rows="5"
        @row-select="getCatalog"
        responsiveLayout="scroll"
      >
        <Column
          field="didId"
          header="DID"
          :sortable="true"
          headerStyle="min-width:12rem;"
        ></Column>
        <Column
          field="address"
          header="Address"
          :sortable="true"
          headerStyle="min-width:12rem;"
        ></Column>
      </DataTable>
    </template>
  </Card>
  <Card
    style="border-radius: 12px; border: 1px solid var(--surface-border)"
    class="my-8"
  >
    <template #title>Browse Datasets</template>
    <template #content
      >In this view, all the datasets of the dataspace are shown.</template
    >
  </Card>
  <div v-for="catalog in catalogs">
    <!-- TODO get catalogs and make sure the component supports merging data sets. -->
    <div class="grid grid-cols-12 gap-8 card-container mb-4">
      <Catalog
        :url="catalog['dcat:service'][0]['dcat:endpointURL']"
        :catalog="catalog"
        :single-catalog="false"
        :own-catalog="false"
        :assigner="assigner"
      ></Catalog>
    </div>
  </div>
</template>
