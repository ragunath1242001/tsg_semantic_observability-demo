<script setup lang="ts">
import {
  DataPlaneStateDto,
} from "@tsg-dsp/common-dtos";
import { ref, onMounted } from "vue";
import { axiosInstance } from "../store";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
// import schema from "@tsg-dsp/common-ui/assets/dataset-config.schema.json";
import { Dataset, DatasetDto, deserialize } from "@tsg-dsp/common-dsp";
import { obtainValues } from "../utils/common";


const toast = useToast();
const confirm = useConfirm();

const state = ref<DataPlaneStateDto>();
const datasets = ref<DatasetDto[]>();
const datasetStrings = ref<string[]>();
const newDataset = ref<string>(JSON.stringify({
  "@context": "https://w3id.org/dspace/2024/1/context.json",
  "@id": `urn:uuid:${crypto.randomUUID()}`,
  "@type": "dcat:Dataset",
}, null, 2));

// const odrlOfferSchema = {
//   $schema: "http://json-schema.org/draft-07/schema#",
//   title:
//     "Dataspace Protocol Message Offer (https://w3id.org/dspace/2024/1/negotiation/contract-schema.json#/definitions/MessageOffer)",
//   type: "object",
//   $ref: "https://w3id.org/dspace/2024/1/negotiation/contract-schema.json#/definitions/MessageOffer",
// };

obtainValues([])

const updateLoading = ref(false);
const refreshLoading = ref(false);

const showDataset = ref(false);

const getState = async () => {
  try {
    const response = await axiosInstance.get<DataPlaneStateDto>(
      "management/state"
    );
    state.value = response.data;
  } catch (err) {
    const message =
      err.response?.data?.message ||
      "Could not load state from the HTTP data plane";
    toast.add({
      severity: "warn",
      summary: "Loading state failed",
      detail: message,
      life: 10000,
    });
  }
};

const getDatasetConfig = async () => {
  try {
    const response = await axiosInstance.get<DatasetDto[]>(
      "management/dataset"
    );
    datasets.value = response.data;
    datasetStrings.value = response.data.map(dataset => JSON.stringify(dataset, null, 2));
  } catch (err) {
    const message =
      err.response?.data?.message ||
      "Could not load dataset config from the Analytics data plane";
    toast.add({
      severity: "warn",
      summary: "Loading dataset config failed",
      detail: message,
      life: 10000,
    });
  }
};

const refreshRegistration = async () => {
  refreshLoading.value = true;
  try {
    await axiosInstance.post("management/refresh");
    await getDatasetConfig();
  } catch (err) {
    const message =
      err.response?.data?.message ||
      "Could not load dataset config from the HTTP data plane";
    toast.add({
      severity: "warn",
      summary: "Loading dataset config failed",
      detail: message,
      life: 10000,
    });
  }
  refreshLoading.value = false;
};

const deleteDataset = async (id: string) => {
  confirm.require({
      header: `Are you sure you want to delete this dataset?`,
      message: "This will completely remove the dataset from this dataplane and is irreversible!",
      icon: "pi pi-info-circle",
      rejectLabel: "Cancel",
      acceptLabel: "Confirm",
      rejectClass: "p-button-secondary p-button-outlined",
      acceptClass: "p-button-danger",
      accept: async () => {
        refreshLoading.value = true;
        try {
          await axiosInstance.delete("management/dataset", {
            params: {
              datasetId: id
            }
          });
          await getDatasetConfig();
          toast.add({
            severity: "success",
            summary: "Success",
            detail: `Successfully deleted dataset ${id}`,
            life: 3000,
          });
        } catch (err) {
          const message =
            err.response?.data?.message ||
            "Could not delete dataset";
          toast.add({
            severity: "warn",
            summary: "Dataset deletion failed",
            detail: message,
            life: 10000,
          });
        }
        refreshLoading.value = false;
      },
    });
}

const updateDataset = async (id: string, updatedDataset: string) => {
  refreshLoading.value = true;
  try {
    const parsed = JSON.parse(updatedDataset);
    await deserialize<Dataset>(parsed);
    await axiosInstance.put("management/dataset", parsed, {
      params: {
        datasetId: id
      }
    });
    await getDatasetConfig();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: `Successfully updated dataset ${id}`,
      life: 3000,
    });
  } catch (err) {
    let message = "Could not update dataset";
    if (err.response?.data?.message) {
      message = err.response?.data?.message
    }
    if (err.errors) {
      message = err.message;
    }
    toast.add({
      severity: "warn",
      summary: "Dataset update failed",
      detail: message,
      life: 10000,
    });
  }
  refreshLoading.value = false;
}

const addDataset = async () => {
  refreshLoading.value = true;
  try {
    const parsed = JSON.parse(newDataset.value);
    await deserialize<Dataset>(parsed);
    await axiosInstance.post("management/dataset", parsed);
    await getDatasetConfig();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: `Successfully added dataset ${parsed['@id']}`,
      life: 3000,
    });
  } catch (err) {
    let message = "Could not add dataset";
    if (err.response?.data?.message) {
      message = err.response?.data?.message
    }
    if (err.errors) {
      message = err.message;
    }
    toast.add({
      severity: "warn",
      summary: "Dataset creation failed",
      detail: message,
      life: 10000,
    });
  }
  refreshLoading.value = false;
}

onMounted(async () => {
  await getState();
  await getDatasetConfig();
});
</script>

<template>
  <Card>
    <template #title>State</template>
    <template #subtitle>State of this HTTP data plane</template>
    <template #content>
      <div class="grid grid-cols-12 gap-4" v-if="state">
        <div class="col-span-12 lg:col-span-8">
          <FormField label="Identifier">{{ state.identifier }}</FormField>
          <FormField label="Type">{{ state.details.dataplaneType }}</FormField>
          <FormField label="Synchronization">{{
            state.details.catalogSynchronization
          }}</FormField>
          <FormField label="Role">{{ state.details.role }}</FormField>
          <FormField label="Dataset IDs">
            <div v-for="dataset in datasets">
              {{ dataset["@id"] }}
            </div>
          </FormField>
        </div>
        <div class="col-span-12 lg:col-span-4">
          <div>
            <Button
              icon="pi pi-refresh"
              severity="info"
              label="Refresh state at Control Plane"
              :loading="refreshLoading"
              @click="refreshRegistration"
            />
          </div>
        </div>
      </div>
    </template>
  </Card>
  <Card class="mt-8" v-for="(dataset, idx) in datasets">
    <template #title>{{ dataset['dct:title'] ?? dataset['@id'] }}</template>
    <template #subtitle
      >Dataset registered at the data plane</template
    >
    <template #content>
      <MonacoEditorVue
        v-model="datasetStrings[idx]"
        :maxLines="200"
        style="max-height: calc(90vh - 16rem)"
      />
    </template>
    <template #footer>
        <div class="flex gap-4 mt-1">
          <Button label="Update" class="w-full" @click="updateDataset(dataset['@id'], datasetStrings[idx])" />
          <Button label="Delete" severity="danger" outlined class="w-full" @click="deleteDataset(dataset['@id'])" />
        </div>
    </template>
  </Card>
  <Card class="mt-8">
    <template #title>Add dataset</template>
    <template #subtitle>Register a new dataset in this data plane</template>
    <template #content>
      <MonacoEditorVue
        v-model="newDataset"
        :maxLines="200"
        style="max-height: calc(90vh - 16rem)"
      />
    </template>
    <template #footer>
        <div class="flex gap-4 mt-1">
          <Button label="Add" class="w-full" @click="addDataset" />
        </div>
    </template>
  </Card>
</template>
