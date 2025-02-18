<script setup lang="ts">
import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import { CatalogDto } from "@tsg-dsp/common-dsp";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";
import Catalog from "../components/Catalog.vue";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import router from "../router";
import { useCatalogStore } from "../stores/catalog";
import { storeToRefs } from "pinia";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

const addresses = ref<string[]>();
const selection = ref<CredentialAddress>(null);
const assigner = ref("");

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
    toast.add(
      toastError({
        error,
        summary: "Failed to retrieve addresses",
        defaultMessage: `Could not load the addresses from the registry`
      })
    );
    console.error("Error:", error);
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
    toast.add(
      toastError({
        error,
        summary: "Failed to retrieve catalogs",
        defaultMessage: `Could not load the catalogs from the registry`
      })
    );
    console.error("Error:", error);
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
    class="mt-8">
    <template #title>Addresses</template>
    <template #subtitle
      >Overview of all participants in the dataspace. Click an entry to request
      their catalog.</template
    >
    <template #content>
      <DataTable
        v-model:selection="selection"
        :value="addresses"
        selection-mode="single"
        :paginator="true"
        :rows="5"
        responsive-layout="scroll"
        @row-select="getCatalog">
        <Column
          field="didId"
          header="DID"
          :sortable="true"
          header-style="min-width:12rem;"></Column>
        <Column
          field="address"
          header="Address"
          :sortable="true"
          header-style="min-width:12rem;"
          class="break-all"></Column>
      </DataTable>
    </template>
  </Card>
  <Card
    style="border-radius: 12px; border: 1px solid var(--surface-border)"
    class="my-8">
    <template #title>Browse Datasets</template>
    <template #content
      >In this view, all the datasets of the dataspace are shown.</template
    >
  </Card>
  <div v-for="catalog in catalogs" :key="catalog['@id']">
    <!-- TODO get catalogs and make sure the component supports merging data sets. -->
    <div class="grid grid-cols-12 gap-8 card-container mb-4">
      <Catalog
        :url="catalog['dcat:service'][0]['dcat:endpointURL']"
        :catalog="catalog"
        :single-catalog="false"
        :own-catalog="false"
        :assigner="assigner"></Catalog>
    </div>
  </div>
</template>
