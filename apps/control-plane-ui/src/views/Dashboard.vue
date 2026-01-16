<script setup lang="ts">
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { onMounted } from "vue";

import Status from "../components/Status.vue";
import { useDataPlaneStore } from "../stores/dataplane";
import { useDspStore } from "../stores/dsp";

const toast = useToast();

const { ctaTransfersCount, ownCatalog } = storeToRefs(useDspStore());
const { dataPlanes } = storeToRefs(useDataPlaneStore());
const initialize = async () => {
  try {
    useDataPlaneStore().getDataPlanes();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to get dataplanes",
        defaultMessage: `Could not load dataplanes`
      })
    );
  }
};

onMounted(async () => await initialize());
</script>
<template>
  <div class="grid grid-cols-12 gap-8">
    <Card class="col-span-12">
      <template #title>Control Plane Dashboard</template>
      <template #content>
        <p>This page displays the overview of the current control plane.</p>
      </template>
    </Card>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <Card>
        <template #content>
          <div class="flex justify-between mb-6">
            <div>
              <span class="block text-muted-color font-medium mb-6"
                >Datasets</span
              >
              <div
                class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ ownCatalog.numberOfDatasets }}
              </div>
            </div>
            <div
              class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border"
              style="width: 2.5rem; height: 2.5rem">
              <i class="pi pi-file text-blue-500 !text-xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <Card>
        <template #content>
          <div class="flex justify-between mb-6">
            <div>
              <span class="block text-muted-color font-medium mb-6"
                >Services</span
              >
              <div
                class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ ownCatalog.numberOfServices }}
              </div>
            </div>
            <div
              class="flex items-center justify-center bg-orange-100 rounded-border"
              style="width: 2.5rem; height: 2.5rem">
              <i class="pi pi-cloud text-orange-500 !text-xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <Card>
        <template #content>
          <div class="flex justify-between mb-6">
            <div>
              <span class="block text-muted-color font-medium mb-6"
                >Data Planes</span
              >
              <div
                class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ dataPlanes.length }}
              </div>
            </div>
            <div
              class="flex items-center justify-center bg-cyan-100 rounded-border"
              style="width: 2.5rem; height: 2.5rem">
              <i class="pi pi-inbox text-cyan-500 !text-xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
      <Card>
        <template #content>
          <div class="flex justify-between mb-6">
            <div>
              <span class="block text-muted-color font-medium mb-6"
                >Active Transfers</span
              >
              <div
                class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                {{ ctaTransfersCount }}
              </div>
            </div>
            <div
              class="flex items-center justify-center bg-purple-100 rounded-border"
              style="width: 2.5rem; height: 2.5rem">
              <i
                class="pi pi-arrow-right-arrow-left text-purple-500 !text-xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>
    <Status />
  </div>
</template>
