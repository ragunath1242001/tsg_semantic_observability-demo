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
  <div class="grid grid-cols-12 gap-8">
    <Card
      class="col-span-12"
      style="border-radius: 12px; border: 1px solid var(--surface-border)"
    >
      <template #title>Control Plane Dashboard</template>
      <template #content
        ><p>
          This page displays the Catalog that is available through your control
          plane. It shows the datasets that are part of your catalog.
        </p></template
      >
    </Card>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <Card
        style="border-radius: 12px; border: 1px solid var(--surface-border)"
      >
        <template #content>
          <div class="flex justify-between mb-6">
            <div>
              <span class="block text-muted-color font-medium mb-6"
                >Datasets</span
              >
              <div
                class="text-surface-900 dark:text-surface-0 font-medium text-xl"
              >
                {{ ownCatalog.numberOfDatasets }}
              </div>
            </div>
            <div
              class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border"
              style="width: 2.5rem; height: 2.5rem"
            >
              <i class="pi pi-file text-blue-500 !text-xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <Card
        style="border-radius: 12px; border: 1px solid var(--surface-border)"
      >
        <template #content>
          <div class="flex justify-between mb-6">
            <div>
              <span class="block text-muted-color font-medium mb-6"
                >Services</span
              >
              <div
                class="text-surface-900 dark:text-surface-0 font-medium text-xl"
              >
                {{ ownCatalog.numberOfServices }}
              </div>
            </div>
            <div
              class="flex items-center justify-center bg-orange-100 rounded-border"
              style="width: 2.5rem; height: 2.5rem"
            >
              <i class="pi pi-cloud text-orange-500 !text-xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <Card
        style="border-radius: 12px; border: 1px solid var(--surface-border)"
      >
        <template #content>
          <div class="flex justify-between mb-6">
            <div>
              <span class="block text-muted-color font-medium mb-6"
                >Data Planes</span
              >
              <div
                class="text-surface-900 dark:text-surface-0 font-medium text-xl"
              >
                {{ dataPlanesCount }}
              </div>
            </div>
            <div
              class="flex items-center justify-center bg-cyan-100 rounded-border"
              style="width: 2.5rem; height: 2.5rem"
            >
              <i class="pi pi-inbox text-cyan-500 !text-xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <Card
        style="border-radius: 12px; border: 1px solid var(--surface-border)"
      >
        <template #content>
          <div class="flex justify-between mb-6">
            <div>
              <span class="block text-muted-color font-medium mb-6"
                >Active Transfers</span
              >
              <div
                class="text-surface-900 dark:text-surface-0 font-medium text-xl"
              >
                {{ ctaTransfersCount }}
              </div>
            </div>
            <div
              class="flex items-center justify-center bg-purple-100 rounded-border"
              style="width: 2.5rem; height: 2.5rem"
            >
              <i
                class="pi pi-arrow-right-arrow-left text-purple-500 !text-xl"
              ></i>
            </div>
          </div>
        </template>
      </Card>
    </div>
    <Catalog
      :catalog="ownCatalog.catalog"
      v-if="ownCatalog.catalog"
      :single-catalog="true"
      :own-catalog="true"
      url=""
      assigner=""
    />
  </div>
</template>
<!-- <style scoped>
.card-container {
  display: flex;
  flex-wrap: wrap;
}

.card {
  flex: 1 1 auto;
  margin-right: 1rem;
} 
</style> -->
