<script setup lang="ts">
import { onMounted, ref } from "vue";
import { axiosInstance } from "../store/index.js";
import { useToast } from "primevue/usetoast";
import { DataPlaneStateDto, TransferDto } from "@libs/dtos";
import FormField from "../components/FormField.vue";
import { JsonTreeView } from "json-tree-view-vue3";

const toast = useToast();

const showDataset = ref(false);
const state = ref<DataPlaneStateDto>();
const transfers = ref<TransferDto[]>();

const getState = async () => {
  try {
    const response = await axiosInstance.get<DataPlaneStateDto>("management/state");
    state.value = response.data;
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "Loading state failed",
      detail: "Could not load state from the HTTP data plane",
      life: 10000,
    });
  }
}

const getTransfers = async () => {
  try {
    const response = await axiosInstance.get<TransferDto[]>("management/transfers");
    transfers.value = response.data;
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "Loading state failed",
      detail: "Could not load state from the HTTP data plane",
      life: 10000,
    });
  }
}

onMounted(async () => {
  await getState();
  await getTransfers();
});
</script>

<template>
  <div>
    <Card>
      <template #title>State</template>
      <template #subtitle>State of this HTTP data plane</template>
      <template #content>
        <template v-if="state">
          <FormField label="Identifier">{{ state.identifier }}</FormField>
          <FormField label="Type">{{ state.details.dataplaneType }}</FormField>
          <FormField label="Synchronization">{{ state.details.catalogSynchronization }}</FormField>
          <FormField label="Role">{{ state.details.role }}</FormField>
          <FormField label="Dataset ID">{{ state.dataset["@id"] }}</FormField>

          <Button
            label="Show DCAT dataset"
            @click="showDataset = true"
          />
          <Dialog
            v-model:visible="showDataset"
            modal
            header="DCAT dataset"
            :style="{ width: '90vw', maxWidth: '75rem' }"
          >
            <JsonTreeView
              :data="JSON.stringify(state.dataset)"
              color-scheme="dark"
              root-key="Dataset"
              :max-depth="5"
            />
          </Dialog>
        </template>
      </template>
    </Card>
    <Card class="mt-5">
      <template #title>Transfers</template>
      <template #subtitle>Transfers executed by this data plane</template>
      <template #content>
        <DataTable
          :value="transfers"
          sort-field="id"
          :sort-order="1"
          paginator
          :rows="10"
        >
          <Column field="id" header="ID" />
          <Column field="role" header="Role" />
          <Column field="processId" header="Process ID" />
          <Column field="state" header="State" />
          <Column field="createdDate" header="Date" />
        </DataTable>
      </template>
    </Card>
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
