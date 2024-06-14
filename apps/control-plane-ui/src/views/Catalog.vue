<script setup lang="ts">
import { onMounted, ref } from "vue";
import { type CatalogDto } from "@libs/common-dsp";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import Catalog from "../components/Catalog.vue";
import { useToast } from "primevue/usetoast";
import { CredentialAddress } from "@libs/control-plane-dtos";
import OverlayPanel from "primevue/overlaypanel";
import FormField from "../components/FormField.vue";
import { storeToRefs } from "pinia";
import { useCatalogStore } from "../stores/catalog";
import router from "../router";

// Define a ref for the URL input
const overlay = ref(null);

const { catalog, urlInput, assigner, didInput } = storeToRefs(
  useCatalogStore()
);
var dataAvailable = ref(false);
var loading = ref(false);
var manual = ref(true);
var selection = ref<CredentialAddress>(null);

const http = injectStrict(AxiosKey);

const toast = useToast();

const getCatalog = async () => {
  try {
    if (!manual.value) {
      urlInput.value = selection.value.address;
      didInput.value = selection.value.didId;
      overlay.value.hide();
    }
    if (!urlInput.value) {
      return;
    }
    const audience = didInput.value.trim() === "" ? undefined : didInput.value;
    loading.value = true;
    const response = await http.get<CatalogDto>("management/catalog/request", {
      params: {
        address: urlInput.value,
        audience: audience,
      },
    });
    catalog.value = response.data;
    dataAvailable.value = true;
    loading.value = false;
    return catalog;
  } catch (error) {
    // Handle error
    console.error("Error:", error);
    toast.add({
      severity: "error",
      summary: "Failed to retrieve catalog",
      detail: `${error.response.data.message}`,
    });
    throw error;
  }
};

const goToRegistry = () => {
  router.push("/registry");
};

const initialize = async () => {
  getCatalog();
};
onMounted(async () => await initialize());
</script>
<template>
  <div>
    <Card
      style="border-radius: 12px; border: 1px solid var(--surface-border)"
      class="mb-5"
    >
      <template #title>Catalog Request</template>
      <template #subtitle
        >Use this page to find other catalogs. You can search for other Control
        Planes using the Registry, or enter an access URL and a DID manually if
        you already know which party you want to query. Submitting the form will
        send a Catalog Request according to the
        <a
          target="_blank"
          href="https://docs.internationaldataspaces.org/ids-knowledgebase/v/dataspace-protocol/catalog/catalog.protocol"
          >Catalog Protocol in the Dataspace Protocol</a
        >.</template
      >
      <template #content>
        <form @submit.stop.prevent="getCatalog">
          <div class="p-fluid formgrid grid">
            <div class="field col-12 md:col-6">
              <span class="p-float-label">
                <InputText id="url" type="text" v-model="urlInput" />
                <label for="url">Url of Catalog to Request</label>
              </span>
            </div>
            <div class="field col-12 md:col-6">
              <span class="p-float-label">
                <InputText id="did" type="text" v-model="didInput" />
                <label for="did">DID identifier</label>
              </span>
            </div>
            <div class="field ml-3">
              <Button label="Submit" type="submit"></Button>
            </div>
          </div>
        </form>
      </template>
    </Card>
    <div class="grid card-container">
      <Catalog
        :catalog="catalog"
        :url="urlInput"
        :own-catalog="false"
        :assigner="assigner"
        :single-catalog="true"
        v-if="dataAvailable"
      />
      <Skeleton
        width="100%"
        height="150px"
        v-else-if="!dataAvailable && loading"
      />
      <div class="col-12 lg:col-6" v-else>
        <Card
          style="border-radius: 12px; border: 1px solid var(--surface-border)"
          ><template #title><h5>Find others</h5></template>
          <template #content>
            <Button
              type="button"
              label="Go to Registry"
              @click="goToRegistry"
              icon="pi pi-external-link"
              iconPos="right"
            ></Button></template
        ></Card>
      </div>
    </div>
  </div>
</template>
