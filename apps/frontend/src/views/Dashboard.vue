<script setup lang="ts">
import { onMounted, ref } from "vue";
import { type CatalogDto } from "@tsg-dsp/common";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import Catalog from "../components/Catalog.vue";
import { useToast } from "primevue/usetoast";
import { storeToRefs } from "pinia";
import { useDspStore } from "../stores/dsp";

const urlInput = ref("");
var catalog = ref<CatalogDto>();
var dataAvailable = ref(false);
var numberOfDatasets = ref(0);
var numberOfServices = ref(0);
var dataPlanesCount = ref(0);

const { ctaTransfersCount } = storeToRefs(useDspStore());

const http = injectStrict(AxiosKey);

const toast = useToast();

const getCatalog = async () => {
  try {
    const response = await http.get<CatalogDto>(
      `management/catalog/request?address=${urlInput.value}`
    );
    catalog.value = response.data;
    dataAvailable.value = true;
    numberOfDatasets.value = response.data["dcat:dataset"]?.length ?? 0;
    numberOfServices.value = response.data["dcat:service"]?.length ?? 0;
    return catalog;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const getDataPlanes = async () => {
  try {
    const response = await http.get("management/dataplanes/");
    dataPlanesCount.value = response.data.length;
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Failed to get dataplanes",
      detail: `${e.response.data.message}`,
      life: 3000,
    });
  }
};

const initialize = async () => {
  getDataPlanes();
  getCatalog();
};

onMounted(async () => await initialize());
</script>
<template>
  <div>
    <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
      <template #title>Control Plane Dashboard</template>
      <template #content
        ><p>
          This page displays the Catalog that is available through your control
          plane. It shows the datasets that are part of your catalog.
        </p></template
      >
    </Card>
    <div class="grid card-container mt-3" v-if="dataAvailable">
      <div class="col-12 lg:col-6 xl:col-3">
        <Card
          style="border-radius: 12px; border: 1px solid var(--surface-border)"
        >
          <template #content>
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3">Datasets</span>
                <div class="text-900 font-medium text-xl">
                  {{ numberOfDatasets }}
                </div>
              </div>
              <div
                class="flex align-items-center justify-content-center bg-blue-100 border-round"
                style="width: 2.5rem; height: 2.5rem"
              >
                <i class="pi pi-file text-blue-500 text-xl"></i>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-12 lg:col-6 xl:col-3">
        <Card
          style="border-radius: 12px; border: 1px solid var(--surface-border)"
        >
          <template #content>
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3">Services</span>
                <div class="text-900 font-medium text-xl">
                  {{ numberOfServices }}
                </div>
              </div>
              <div
                class="flex align-items-center justify-content-center bg-orange-100 border-round"
                style="width: 2.5rem; height: 2.5rem"
              >
                <i class="pi pi-cloud text-orange-500 text-xl"></i>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-12 lg:col-6 xl:col-3">
        <Card
          style="border-radius: 12px; border: 1px solid var(--surface-border)"
        >
          <template #content>
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3">Data Planes</span>
                <div class="text-900 font-medium text-xl">
                  {{ dataPlanesCount }}
                </div>
              </div>
              <div
                class="flex align-items-center justify-content-center bg-cyan-100 border-round"
                style="width: 2.5rem; height: 2.5rem"
              >
                <i class="pi pi-inbox text-cyan-500 text-xl"></i>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-12 lg:col-6 xl:col-3">
        <Card
          style="border-radius: 12px; border: 1px solid var(--surface-border)"
        >
          <template #content>
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3"
                  >Active Transfers</span
                >
                <div class="text-900 font-medium text-xl">
                  {{ ctaTransfersCount }}
                </div>
              </div>
              <div
                class="flex align-items-center justify-content-center bg-purple-100 border-round"
                style="width: 2.5rem; height: 2.5rem"
              >
                <i
                  class="pi pi-arrow-right-arrow-left text-purple-500 text-xl"
                ></i>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <Catalog
      :catalog="catalog"
      :single-catalog="true"
      :own-catalog="true"
      url=""
      type="provider"
      assigner=""
      v-if="dataAvailable"
    />
    <Skeleton width="100%" height="150px" v-else />
  </div>
</template>
<style scoped>
.card-container {
  display: flex;
  flex-wrap: wrap;
}

.card {
  flex: 1 1 auto;
  margin-right: 1rem; /* Adjust margin as needed */
}
</style>
