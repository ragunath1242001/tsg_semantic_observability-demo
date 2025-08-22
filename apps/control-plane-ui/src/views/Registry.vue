<script setup lang="ts">
import { CatalogDto } from "@tsg-dsp/common-dsp";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";

const userStore = useUserStore();

import Catalog from "../components/Catalog.vue";
import router from "../router";
import { useCatalogStore } from "../stores/catalog";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";

const addresses = ref<string[]>();
const selection = ref<CredentialAddress>(null);
const assigner = ref("");

const catalogs = ref<CatalogDto[]>();

const toast = useToast();
const http = injectStrict(AxiosKey);
const { urlInput, didInput } = storeToRefs(useCatalogStore());

const queryAddresses = async () => {
  try {
    const response = await http.get(`management/registry/addresses`);
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
  if (!userStore.isReadOnly) {
    urlInput.value = selection.value.address;
    didInput.value = selection.value.didId;
    router.push({ path: "/catalog/request" });
    return;
  }
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
      >Overview of all participants in the dataspace. The DID and addresses are
      fetched from the Dataspace Authority.</template
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
        :url="catalog.service[0].endpointURL"
        :catalog="catalog"
        :single-catalog="false"
        :own-catalog="false"
        :assigner="assigner"></Catalog>
    </div>
  </div>
</template>
