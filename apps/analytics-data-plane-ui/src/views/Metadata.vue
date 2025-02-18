<script setup lang="ts">
import { DataPlaneStateDto } from "@tsg-dsp/common-dtos";
import { ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { Dataset, DatasetDto, deserialize } from "@tsg-dsp/common-dsp";
import http from "@tsg-dsp/common-ui/utils/http";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

const toast = useToast();
const confirm = useConfirm();

const state = ref<DataPlaneStateDto>();
const datasets = ref<DatasetDto[]>();
const datasetStrings = ref<string[]>();
const newDataset = ref<string>(
  JSON.stringify(
    {
      "@context": "https://w3id.org/dspace/2024/1/context.json",
      "@id": `urn:uuid:${crypto.randomUUID()}`,
      "@type": "dcat:Dataset"
    },
    null,
    2
  )
);

const refreshLoading = ref(false);

const getState = async () => {
  try {
    const response = await http.get<DataPlaneStateDto>("management/state");
    state.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading state failed",
        defaultMessage:
          "Could not load state config from the Analytics data plane"
      })
    );
  }
};

const getDatasetConfig = async () => {
  try {
    const response = await http.get<DatasetDto[]>("management/dataset");
    datasets.value = response.data;
    datasetStrings.value = response.data.map((dataset) =>
      JSON.stringify(dataset, null, 2)
    );
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading dataset config failed",
        defaultMessage:
          "Could not load dataset config from the Analytics data plane"
      })
    );
  }
};

const refreshRegistration = async () => {
  refreshLoading.value = true;
  try {
    await http.post("management/refresh");
    await getDatasetConfig();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading dataset config failed",
        defaultMessage:
          "Could not refresh registration at the Analytics data plane"
      })
    );
  }
  refreshLoading.value = false;
};

const deleteDataset = async (id: string) => {
  confirm.require({
    header: `Are you sure you want to delete this dataset?`,
    message:
      "This will completely remove the dataset from this dataplane and is irreversible!",
    icon: "pi pi-info-circle",
    rejectLabel: "Cancel",
    acceptLabel: "Confirm",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      refreshLoading.value = true;
      try {
        await http.delete("management/dataset", {
          params: {
            datasetId: id
          }
        });
        await getDatasetConfig();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: `Successfully deleted dataset ${id}`,
          life: 3000
        });
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: "Dataset deletion failed",
            defaultMessage: "Could not delete dataset"
          })
        );
      }
      refreshLoading.value = false;
    }
  });
};

const updateDataset = async (id: string, updatedDataset: string) => {
  refreshLoading.value = true;
  try {
    const parsed = JSON.parse(updatedDataset);
    await deserialize<Dataset>(parsed);
    await http.put("management/dataset", parsed, {
      params: {
        datasetId: id
      }
    });
    await getDatasetConfig();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: `Successfully updated dataset ${id}`,
      life: 3000
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Dataset update failed",
        defaultMessage: "Could not update dataset"
      })
    );
  }
  refreshLoading.value = false;
};

const addDataset = async () => {
  refreshLoading.value = true;
  try {
    const parsed = JSON.parse(newDataset.value);
    await deserialize<Dataset>(parsed);
    await http.post("management/dataset", parsed);
    await getDatasetConfig();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: `Successfully added dataset ${parsed["@id"]}`,
      life: 3000
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Dataset creation failed",
        defaultMessage: "Could not add dataset"
      })
    );
  }
  refreshLoading.value = false;
};

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
      <div v-if="state" class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-8">
          <FormField label="Identifier">{{ state.identifier }}</FormField>
          <FormField label="Type">{{ state.details.dataplaneType }}</FormField>
          <FormField label="Synchronization">{{
            state.details.catalogSynchronization
          }}</FormField>
          <FormField label="Role">{{ state.details.role }}</FormField>
          <FormField label="Dataset IDs">
            <div v-for="dataset in datasets" :key="dataset['@id']">
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
              @click="refreshRegistration" />
          </div>
        </div>
      </div>
    </template>
  </Card>
  <Card v-for="(dataset, idx) in datasets" :key="idx" class="mt-8">
    <template #title>{{ dataset["dct:title"] ?? dataset["@id"] }}</template>
    <template #subtitle>Dataset registered at the data plane</template>
    <template #content>
      <MonacoEditorVue
        v-model="datasetStrings[idx]"
        :max-lines="200"
        style="max-height: calc(90vh - 16rem)" />
    </template>
    <template #footer>
      <div class="flex gap-4 mt-1">
        <Button
          label="Update"
          class="w-full"
          @click="updateDataset(dataset['@id'], datasetStrings[idx])" />
        <Button
          label="Delete"
          severity="danger"
          outlined
          class="w-full"
          @click="deleteDataset(dataset['@id'])" />
      </div>
    </template>
  </Card>
  <Card class="mt-8">
    <template #title>Add dataset</template>
    <template #subtitle>Register a new dataset in this data plane</template>
    <template #content>
      <MonacoEditorVue
        v-model="newDataset"
        :max-lines="200"
        style="max-height: calc(90vh - 16rem)" />
    </template>
    <template #footer>
      <div class="flex gap-4 mt-1">
        <Button label="Add" class="w-full" @click="addDataset" />
      </div>
    </template>
  </Card>
</template>
