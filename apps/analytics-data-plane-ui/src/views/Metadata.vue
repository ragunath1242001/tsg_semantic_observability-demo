<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import {
  Dataset,
  DatasetDto,
  defaultContext,
  deserialize
} from "@tsg-dsp/common-dsp";
import { DataPlaneStateDto } from "@tsg-dsp/common-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";

import MetadataWizard from "../components/MetadataWizard.vue";

const toast = useToast();
const confirm = useConfirm();

const state = ref<DataPlaneStateDto>();
const datasets = ref<DatasetDto[]>();
const datasetStrings = ref<string[]>();
const newDataset = ref<string>(
  JSON.stringify(
    {
      "@context": defaultContext(),
      "@id": `urn:uuid:${crypto.randomUUID()}`,
      "@type": "Dataset"
    },
    null,
    2
  )
);

// New UI state
const viewMode = ref<"simple" | "advanced">("simple");
const showWizard = ref(false);
const editingDataset = ref<DatasetDto | null>(null);
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
    console.log(datasets.value);
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
    console.error(error);
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

const startWizard = () => {
  editingDataset.value = null;
  showWizard.value = true;
};

const editDatasetWithWizard = (dataset: DatasetDto) => {
  editingDataset.value = dataset;
  showWizard.value = true;
};

const onWizardComplete = async (dataset: DatasetDto) => {
  refreshLoading.value = true;
  try {
    if (editingDataset.value) {
      await http.put("management/dataset", dataset, {
        params: {
          datasetId: dataset["@id"]
        }
      });
      toast.add({
        severity: "success",
        summary: "Success",
        detail: `Successfully updated dataset ${dataset["@id"]}`,
        life: 3000
      });
    } else {
      // Add new dataset
      await http.post("management/dataset", dataset);
      toast.add({
        severity: "success",
        summary: "Success",
        detail: `Successfully added dataset ${dataset["@id"]}`,
        life: 3000
      });
    }

    await getDatasetConfig();
    showWizard.value = false;
    editingDataset.value = null;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: editingDataset.value
          ? "Dataset update failed"
          : "Dataset creation failed",
        defaultMessage: editingDataset.value
          ? "Could not update dataset"
          : "Could not add dataset"
      })
    );
  }
  refreshLoading.value = false;
};

const cancelWizard = () => {
  showWizard.value = false;
  editingDataset.value = null;
};

onMounted(async () => {
  await getState();
  await getDatasetConfig();
});
</script>

<template>
  <!-- Wizard Modal -->
  <Dialog
    v-model:visible="showWizard"
    modal
    :dismissable-mask="false"
    :closable="false"
    :style="{ width: '95vw', maxWidth: '1200px', height: '90vh' }">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="text-xl font-semibold">
          {{
            editingDataset ? "Edit Dataset Metadata" : "Create Dataset Metadata"
          }}
        </h3>
        <Button
          icon="pi pi-times"
          text
          severity="secondary"
          @click="cancelWizard" />
      </div>
    </template>

    <MetadataWizard v-model="editingDataset" @completed="onWizardComplete" />
  </Dialog>

  <!-- Main Content -->
  <div class="metadata-management">
    <!-- State Information -->
    <Card class="mb-6">
      <template #title>Analytics Data Plane State</template>
      <template #subtitle>Current state and configuration</template>
      <template #content>
        <div v-if="state" class="grid grid-cols-12 gap-4">
          <div class="col-span-12 lg:col-span-8">
            <FormField label="Identifier">{{ state.identifier }}</FormField>
            <FormField label="Type">{{
              state.details.dataplaneType
            }}</FormField>
            <FormField label="Synchronization">{{
              state.details.catalogSynchronization
            }}</FormField>
            <FormField label="Role">{{ state.details.role }}</FormField>
            <FormField label="Dataset IDs">
              <div v-for="dataset in datasets" :key="dataset['@id']">
                {{ dataset["@id"] }}
              </div>
            </FormField>
            <FormField label="View Mode">
              <SelectButton
                v-model="viewMode"
                :options="[
                  { label: 'User-Friendly', value: 'simple' },
                  { label: 'Advanced (JSON)', value: 'advanced' }
                ]"
                option-label="label"
                option-value="value" />
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

    <!-- Existing Datasets - Simple Mode -->
    <div v-if="viewMode === 'simple' && datasets && datasets.length > 0">
      <Card v-for="(dataset, idx) in datasets" :key="idx" class="mb-6">
        <template #title>
          <div class="flex items-center justify-between">
            <span>{{ dataset.title ?? dataset["@id"] }}</span>
            <div class="flex gap-2">
              <Button
                icon="pi pi-pencil"
                severity="info"
                text
                @click="editDatasetWithWizard(dataset)" />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                @click="deleteDataset(dataset['@id'])" />
            </div>
          </div>
        </template>

        <template #subtitle>
          {{
            Array.isArray(dataset.description)
              ? dataset.description[0]
              : dataset.description
          }}
        </template>

        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField v-if="dataset.creator" label="Creator">{{
              dataset.creator
            }}</FormField>
            <FormField v-if="dataset.publisher" label="Publisher">{{
              dataset.publisher
            }}</FormField>
            <FormField v-if="dataset.language" label="Language">{{
              dataset.language
            }}</FormField>
            <FormField v-if="dataset.license" label="License">{{
              dataset.license
            }}</FormField>
            <FormField v-if="dataset.version" label="Version">{{
              dataset.version
            }}</FormField>
            <FormField v-if="dataset.issued" label="Issued">{{
              dataset.issued
            }}</FormField>

            <FormField
              v-if="dataset.keyword && dataset.keyword.length > 0"
              label="Keywords"
              class="md:col-span-2">
              <div class="flex gap-1 flex-wrap">
                <Tag
                  v-for="keyword in dataset.keyword"
                  :key="keyword"
                  :value="keyword" />
              </div>
            </FormField>

            <FormField
              v-if="dataset.theme && dataset.theme.length > 0"
              label="Themes"
              class="md:col-span-2">
              <div class="flex gap-1 flex-wrap">
                <Tag
                  v-for="theme in dataset.theme"
                  :key="theme"
                  :value="theme" />
              </div>
            </FormField>
          </div>
        </template>
      </Card>
    </div>

    <!-- Add Dataset Card - Always visible in simple mode -->
    <div v-if="viewMode === 'simple'">
      <Card class="add-dataset-card mb-2" @click="startWizard()">
        <template #content>
          <div class="text-center py-4">
            <i class="pi pi-plus-circle text-4xl text-blue-500 mb-2 block"></i>
            <h5 class="font-semibold mb-2 text-lg">Create New Dataset</h5>
            <p class="text-sm text-gray-600">
              Add a new dataset with comprehensive metadata
            </p>
          </div>
        </template>
      </Card>
    </div>

    <!-- Existing Datasets - Advanced Mode (Original JSON view) -->
    <div v-if="viewMode === 'advanced'">
      <Card v-for="(dataset, idx) in datasets" :key="idx" class="mt-8">
        <template #title>{{ dataset.title ?? dataset["@id"] }}</template>
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

      <!-- Add Dataset (Advanced Mode) -->
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
    </div>
  </div>
</template>

<style scoped>
.add-dataset-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px dashed #d1d5db;
  background: rgba(249, 250, 251, 0.5);
}

.add-dataset-card:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
  transform: translateY(-1px);
}

.add-dataset-card .p-card-content {
  padding: 0;
}
</style>
