<script setup lang="ts">
import {
  CollectionDatasetConfig,
  DatasetConfig,
  VersionedDatasetConfig
} from "@tsg-dsp/http-data-plane-dtos";
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { DataPlaneStateDto } from "@tsg-dsp/common-dtos";
import http from "@tsg-dsp/common-ui/utils/http";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import VersionedDatasetManagement from "../components/VersionedDatasetManagement.vue";
import { plainToInstance } from "class-transformer";
import CollectionDatasetManagement from "../components/CollectionDatasetManagement.vue";

const toast = useToast();
const confirm = useConfirm();

const state = ref<DataPlaneStateDto>();
const versionedConfig = ref<VersionedDatasetConfig>();
const collectionConfig = ref<CollectionDatasetConfig>();

const getState = async () => {
  try {
    const response = await http.get<DataPlaneStateDto>("management/state");
    state.value = plainToInstance(DataPlaneStateDto, response.data);
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading state failed",
        defaultMessage: `Could not load state from the HTTP data plane`
      })
    );
  }
};
const getDatasetConfig = async () => {
  try {
    const response = await http.get<DatasetConfig>("management/config");
    const config = DatasetConfig.parse(response.data);
    if (config instanceof VersionedDatasetConfig) {
      versionedConfig.value = config;
      collectionConfig.value = undefined;
    } else if (config instanceof CollectionDatasetConfig) {
      collectionConfig.value = config;
      versionedConfig.value = undefined;
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading dataset config failed",
        defaultMessage: `Could not load dataset config from the HTTP data plane`
      })
    );
  }
};

const refresh = async () => {
  await getState();
  await getDatasetConfig();
};

onMounted(async () => {
  await refresh();
});
</script>

<template>
  <Card v-if="!versionedConfig && !collectionConfig">
    <template #title>State</template>
    <template #subtitle>State of this HTTP data plane</template>
    <template #content>
      <p>Loading...</p>
    </template>
  </Card>
  <VersionedDatasetManagement
    v-if="versionedConfig"
    :state="state"
    :config="versionedConfig"
    @update="refresh" />
  <CollectionDatasetManagement
    v-if="collectionConfig"
    :state="state"
    :config="collectionConfig"
    @update="refresh" />
</template>
