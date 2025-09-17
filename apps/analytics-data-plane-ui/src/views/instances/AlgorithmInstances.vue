<script setup lang="ts">
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { useToast } from "primevue";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { useAlgorithmInstancesStore } from "../../stores/algorithm-instances";
import { getStatusSeverity } from "../../utils/algorithm-instance-status";

const algorithmStore = useAlgorithmInstancesStore();
const toast = useToast();
const router = useRouter();

const selectedAlgorithmInstance = ref();

const reloadAlgorithmInstances = async () => {
  try {
    await algorithmStore.fetchAlgorithmInstances();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading algorithm instances failed",
        defaultMessage:
          "Could not load algorithm instances from the analytics data plane"
      })
    );
  }
};

const initializeData = async () => {
  try {
    await algorithmStore.fetchAlgorithmInstances();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading data failed",
        defaultMessage: "Could not load data from the analytics data plane"
      })
    );
  }
};

const deleteAlgorithmInstance = async (algorithmInstanceId: string) => {
  try {
    await algorithmStore.deleteAlgorithmInstance(algorithmInstanceId);

    toast.add({
      severity: "success",
      summary: "Algorithm Instance deleted",
      detail: "Algorithm Instance has been deleted successfully",
      life: 3000
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error deleting algorithm instance",
        defaultMessage: "Could not delete algorithm instance"
      })
    );
  }
};

const viewAlgorithmInstanceDetails = (algorithmInstanceId: string) => {
  router.push({
    name: "algorithm-instance-details",
    params: { id: algorithmInstanceId }
  });
};

onMounted(async () => {
  await initializeData();
});
</script>

<template>
  <div>
    <Card>
      <template #title>Algorithm instances</template>
      <template #subtitle>Manage and monitor your algorithm instances</template>
      <template #content>
        <div class="flex justify-between items-center mb-4">
          <Button
            icon="pi pi-refresh"
            label="Refresh"
            severity="secondary"
            @click="reloadAlgorithmInstances" />
        </div>

        <DataTable
          v-model:selection="selectedAlgorithmInstance"
          :value="algorithmStore.algorithmInstances"
          selection-mode="single"
          sort-field="createdDate"
          :sort-order="-1"
          :loading="algorithmStore.loading"
          paginator
          :rows="10"
          :rows-per-page-options="[5, 10, 20, 50]"
          table-style="min-width: 50rem">
          <Column field="title" header="Title" sortable>
            <template #body="props">
              <Button
                :label="props.data.algorithmDefinition.title"
                link
                class="p-0 font-bold text-left"
                @click="viewAlgorithmInstanceDetails(props.data.id)" />
            </template>
          </Column>

          <Column field="id" header="ID" sortable>
            <template #body="props">
              <code class="text-xs">{{ props.data.id }}</code>
            </template>
          </Column>

          <Column field="status" header="Status" sortable>
            <template #body="props">
              <Tag
                class="min-w-20"
                :severity="getStatusSeverity(props.data.status)"
                :value="props.data.status" />
            </template>
          </Column>

          <Column field="participantIds" header="Participants">
            <template #body="props">
              <div class="flex flex-wrap gap-1">
                <Tag
                  v-for="participant in props.data.participants"
                  :key="participant.didId"
                  :value="`${participant.didId} (${participant.role})`"
                  size="small"
                  severity="secondary" />
              </div>
            </template>
          </Column>

          <Column field="startedAt" header="Started" sortable>
            <template #body="props">
              <span v-if="props.data.startedAt">
                {{ new Date(props.data.startedAt).toLocaleString() }}
              </span>
              <span v-else class="text-gray-400">Not started</span>
            </template>
          </Column>

          <Column header="Actions">
            <template #body="props">
              <div class="flex gap-2">
                <Button
                  v-tooltip="'Delete Algorithm Instance'"
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  @click="deleteAlgorithmInstance(props.data.id)" />
              </div>
            </template>
          </Column>
          <template #empty>
            <div class="text-center py-8">
              <p class="text-gray-500 mb-4">No algorithm instances found</p>
              <Button
                icon="pi pi-plus"
                label="Create your first algorithm instance"
                @click="router.push('/algorithms/create-instance')" />
            </div>
          </template>
        </DataTable>
      </template>
    </Card>
  </div>
</template>
