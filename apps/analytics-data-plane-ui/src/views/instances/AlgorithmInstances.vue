<script setup lang="ts">
import { Action, Resource } from "@tsg-dsp/common-dtos";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { useToast } from "primevue";
import { useConfirm } from "primevue/useconfirm";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

import { useAlgorithmInstancesStore } from "../../stores/algorithm-instances";
import { useRuntimeStore } from "../../stores/runtime";
import { getStatusSeverity } from "../../utils/algorithm-instance-status";

const algorithmStore = useAlgorithmInstancesStore();
const runtimeStore = useRuntimeStore();
const userStore = useUserStore();
const toast = useToast();
const confirm = useConfirm();
const router = useRouter();

algorithmStore.bindEvents();

const isClientMode = computed(() => runtimeStore.isClientMode);
const canCreateAlgorithmInstances = computed(() =>
  userStore.canAccessRoute(Action.CREATE, Resource.ADP_ALGORITHM)
);
const canDeleteAlgorithmInstances = computed(() =>
  userStore.canAccessRoute(Action.DELETE, Resource.ADP_ALGORITHM)
);

const selectedAlgorithmInstance = ref();
const isShiftPressed = ref(false);

const activeStatuses = ["pending", "running"];
const isActive = (status: string) => activeStatuses.includes(status);

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Shift") {
    isShiftPressed.value = true;
  }
};

const onKeyUp = (event: KeyboardEvent) => {
  if (event.key === "Shift") {
    isShiftPressed.value = false;
  }
};

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

const deleteAlgorithmInstance = (
  algorithmInstanceId: string,
  hardDelete = false
) => {
  confirm.require({
    header: hardDelete
      ? "Hard Delete Algorithm Instance"
      : "Delete Algorithm Instance",
    message: hardDelete
      ? "Are you sure you want to permanently delete this algorithm instance? This cannot be undone."
      : "Are you sure you want to delete this algorithm instance? Associated jobs and resources will be removed.",
    icon: hardDelete ? "pi pi-times-circle" : "pi pi-trash",
    rejectLabel: "Cancel",
    acceptLabel: hardDelete ? "Hard Delete" : "Delete",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await algorithmStore.deleteAlgorithmInstance(
          algorithmInstanceId,
          hardDelete
        );
        toast.add({
          severity: "success",
          summary: hardDelete
            ? "Algorithm Instance hard-deleted"
            : "Algorithm Instance deleted",
          detail: hardDelete
            ? "Algorithm Instance has been permanently deleted"
            : "Algorithm Instance has been deleted successfully",
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
    }
  });
};

const viewAlgorithmInstanceDetails = (algorithmInstanceId: string) => {
  router.push({
    name: "algorithm-instance-details",
    params: { id: algorithmInstanceId }
  });
};

onMounted(async () => {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  await initializeData();
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  isShiftPressed.value = false;
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

          <Column field="projectAgreement" header="Project Agreement">
            <template #body="props">
              <Tag
                v-if="props.data.projectAgreement"
                v-tooltip="props.data.projectAgreement.projectId"
                :value="props.data.projectAgreement.title"
                severity="info" />
              <span v-else class="text-gray-400">-</span>
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

          <Column
            v-if="!isClientMode && canDeleteAlgorithmInstances"
            header="Actions">
            <template #body="props">
              <div class="flex gap-2">
                <Button
                  v-tooltip="
                    isActive(props.data.status)
                      ? 'Stop the instance before deleting'
                      : isShiftPressed
                        ? 'Hard Delete Algorithm Instance (Shift+Click)'
                        : 'Delete Algorithm Instance (Shift+Click for hard delete)'
                  "
                  :icon="isShiftPressed ? 'pi pi-times-circle' : 'pi pi-trash'"
                  size="small"
                  severity="danger"
                  :disabled="isActive(props.data.status)"
                  @click="
                    deleteAlgorithmInstance(props.data.id, $event.shiftKey)
                  " />
              </div>
            </template>
          </Column>
          <template #empty>
            <div class="text-center py-8">
              <p class="text-gray-500 mb-4">No algorithm instances found</p>
              <Button
                v-if="!isClientMode && canCreateAlgorithmInstances"
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
