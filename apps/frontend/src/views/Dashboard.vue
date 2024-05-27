<script setup lang="ts">
import { onMounted, ref } from "vue";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import Catalog from "../components/Catalog.vue";
import { useToast } from "primevue/usetoast";
import { storeToRefs } from "pinia";
import { useDspStore } from "../stores/dsp";

var dataPlanesCount = ref(0);

const http = injectStrict(AxiosKey);

const toast = useToast();

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
const { ctaTransfersCount, ownCatalog } = storeToRefs(useDspStore());
const initialize = async () => {
  const store = useDspStore();
  await store.getOwnCatalog();
  getDataPlanes();
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
    <div class="grid card-container my-3">
      <div class="col-12 lg:col-6 xl:col-3">
        <Card
          style="border-radius: 12px; border: 1px solid var(--surface-border)"
        >
          <template #content>
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3">Datasets</span>
                <div class="text-900 font-medium text-xl">
                  {{ ownCatalog.numberOfDatasets }}
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
                  {{ ownCatalog.numberOfServices }}
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
    <div class="grid card-container">
      <Catalog
        :catalog="ownCatalog.catalog"
        v-if="ownCatalog.catalog"
        :single-catalog="true"
        :own-catalog="true"
        url=""
        type="provider"
        assigner=""
      />
    </div>
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
