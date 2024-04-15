<script setup lang="ts">
import { onMounted, ref } from "vue";
import { type CatalogDto } from "@tsg-dsp/common";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import Catalog from "../components/Catalog.vue";
import { useToast } from "primevue/usetoast";
import { CredentialAddressDto } from "@libs/dtos";
import OverlayPanel from "primevue/overlaypanel";

// Define a ref for the URL input
const urlInput = ref("");
const didInput = ref("");
const overlay = ref(null);
var catalog = ref<CatalogDto>();
var addresses = ref<string[]>();
var dataAvailable = ref(false);
var loading = ref(false);
var manual = ref();
var selection = ref<CredentialAddressDto>(null);
var assigner = ref("");

const http = injectStrict(AxiosKey);

const toast = useToast();

const getCatalog = async () => {
  try {
    if (!manual.value) {
      urlInput.value = selection.value.address;
      didInput.value = selection.value.didId;
      overlay.value.hide();
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

const getOwnCatalog = async () => {
  try {
    const response = await http.get<CatalogDto>("management/catalog/request");
    assigner.value = response.data["dct:publisher"] || "";
    return catalog;
  } catch (error) {
    // Handle error
    console.error("Error:", error);
    throw error;
  }
};

const queryAddresses = async () => {
  try {
    const response = await http.get(`management/registry/addresses`);
    addresses.value = response.data;
    return addresses;
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
const toggle = (event) => {
  overlay.value.toggle(event);
};

const initialize = async () => {
  getOwnCatalog();
  queryAddresses();
};

onMounted(async () => await initialize());
</script>
<template>
  <div class="col-12">
    <div class="card">
      <h5>Catalog Request</h5>
      <div class="flex align-items-center mb-4 gap-2">
        <label>Manual Entry</label><InputSwitch v-model="manual" />
      </div>
      <div class="p-fluid formgrid grid" v-if="manual">
        <div class="field col-12 md:col-6">
          <span class="p-float-label">
            <InputText id="url" type="text" v-model="urlInput" />
            <label for="url">Url of Catalog to Request</label>
          </span>
        </div>
        <div class="field col-12 md:col-6">
          <span class="p-float-label">
            <InputText id="url" type="text" v-model="didInput" />
            <label for="url">DID identifier</label>
          </span>
        </div>
        <div class="field col-12 md:col-1">
          <Button label="Submit" type="button" @click="getCatalog"></Button>
        </div>
      </div>
      <div class="p-fluid formgrid grid" v-if="!manual">
        <div class="flex flex-wrap gap-2">
          <Button label="Query" type="button" @click="toggle"></Button>
          <OverlayPanel
            ref="overlay"
            appendTo="body"
            :showCloseIcon="true"
            id="overlay_panel"
            style="width: 450px"
          >
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
          </OverlayPanel>
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
