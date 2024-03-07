<script setup lang="ts">
import { onMounted, ref } from "vue";
import { type CatalogDto } from "@tsg-dsp/common";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import Catalog from "../components/Catalog.vue";
import { useToast } from "primevue/usetoast";

// Define a ref for the URL input
const urlInput = ref("");
var catalog = ref<CatalogDto>();
var dataAvailable = ref(false);
var loading = ref(false);
var assigner = ref("");

const http = injectStrict(AxiosKey);

const toast = useToast();

const getCatalog = async () => {
  try {
    loading.value = true;
    const response = await http.get<CatalogDto>(
      `management/catalog/request?address=${urlInput.value}`
    );
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

const getOwnCatalog = async () => {
  try {
    const response = await http.get<CatalogDto>(
      `management/catalog/request?address=`
    );
    assigner.value = response.data["dct:publisher"] || "";
    return catalog;
  } catch (error) {
    // Handle error
    console.error("Error:", error);
    throw error;
  }
};
const initialize = async () => {
  getOwnCatalog();
};

onMounted(async () => await initialize());
</script>
<template>
  <div class="col-12">
    <div class="card">
      <h5>Catalog Request</h5>
      <div class="p-fluid formgrid grid">
        <div class="field col-12 md:col-6">
          <span class="p-float-label">
            <InputText id="url" type="text" v-model="urlInput" />
            <label for="url">Url of Catalog to Request</label>
          </span>
        </div>
        <div class="field col-12 md:col-1">
          <Button label="Submit" type="button" @click="getCatalog"></Button>
        </div>
      </div>
    </div>
    <Catalog
      :catalog="catalog"
      :url="urlInput"
      type="consumer"
      :assigner="assigner"
      v-if="dataAvailable"
    />
    <Skeleton
      width="100%"
      height="150px"
      v-else-if="!dataAvailable && loading"
    />
  </div>
</template>
