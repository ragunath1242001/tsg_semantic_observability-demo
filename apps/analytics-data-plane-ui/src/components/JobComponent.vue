<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useToast } from "primevue";
import { onMounted, ref } from "vue";

import { useK8sStore } from "../stores/k8s";

const k8sStore = useK8sStore();
const toast = useToast();

const props = defineProps<{
  transferId: string;
  role: "provider" | "consumer";
}>();

const jobs = ref([]);

const logs = ref("");

const pods = ref([]);

const selectedJob = ref();

const selectedPod = ref();

const creating = ref(false);

const imageName = ref("");

const command = ref("");

const getJobs = async (id: string) => {
  const response = await http.get(`/management/k8s/jobs/transfer/${id}`);
  jobs.value = response.data;
  await getPods();
};

const getPods = async () => {
  const response = await http.get(
    `/management/k8s/jobs/${selectedJob.value.metadata.name}/pods`
  );
  pods.value = response.data.items;
};

const determineSeverity = (status): "warn" | "success" | "danger" => {
  if (status?.active >= 1) {
    return "warn";
  } else if (status?.succeeded >= 1) {
    return "success";
  } else if (status?.failed >= 1) {
    return "danger";
  }
};

const determineStatus = (status): "Pending" | "Completed" | "Failed" => {
  if (status?.active >= 1) {
    return "Pending";
  } else if (status?.succeeded >= 1) {
    return "Completed";
  } else if (status?.failed >= 1) {
    return "Failed";
  }
};

const determinePodSeverity = (status): "warn" | "success" | "danger" => {
  if (status?.phase === "Pending") {
    return "warn";
  } else if (status?.phase === "Running") {
    return "success";
  } else if (status?.phase === "Succeeded") {
    return "success";
  } else if (status?.phase === "Failed") {
    return "danger";
  }
};

const determinePodStatus = (
  status
): "Pending" | "Running" | "Failed" | "Succeeded" => {
  if (status?.phase === "Pending") {
    return "Pending";
  } else if (status?.phase === "Running") {
    return "Running";
  } else if (status?.phase === "Succeeded") {
    return "Succeeded";
  } else if (status?.phase === "Failed") {
    return "Failed";
  }
};

const getLogs = async (podName: string) => {
  const response = await http.get(`/management/k8s/pods/${podName}/logs`);
  logs.value = response.data;
};

const onRowSelectJob = async () => {
  await getPods();
};

const onRowSelectPod = async (event) => {
  await getLogs(event.data.metadata.name);
};

const spawnK8sJob = async () => {
  try {
    const resp = await k8sStore.spawnJob(
      imageName.value,
      props.transferId,
      command.value.split(",").map((c) => c.trim())
    );
    if (resp.status === 201) {
      toast.add({
        severity: "success",
        summary: "Job spawned",
        detail: "Job has been spawned successfully",
        life: 3000
      });
      creating.value = false;
      imageName.value = "";
      command.value = "";
      await getJobs(props.transferId);
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error spawning job",
        defaultMessage: "Could not spawn job for transfer"
      })
    );
  }
};

onMounted(async () => {
  await getJobs(props.transferId);
});
</script>
<template>
  <div>
    <Dialog
      v-model:visible="creating"
      modal
      header="Create a new Job"
      width="30rem">
      <div class="flex-col items-center gap-4 mb-4">
        <FormField label="Image name">
          <InputText v-model="imageName" class="w-full" />
        </FormField>
      </div>
      <div class="flex-col items-center gap-4 mb-4">
        <FormField label="Command">
          <InputText
            id="command"
            v-model="command"
            aria-describedby="command-help"
            placeholder="sh, -c, echo hello world"
            class="w-full" />
          <Message
            id="command-help"
            size="small"
            variant="simple"
            severity="secondary"
            >Command to run in the container, seperate array entries with a
            comma</Message
          >
        </FormField>
      </div>
      <div class="flex justify-end gap-2">
        <form @submit.prevent="spawnK8sJob">
          <Button type="submit" label="Create" />
        </form>
      </div>
    </Dialog>
    <Card class="mt-5">
      <template #title>Jobs</template>
      <template #subtitle>Jobs associated with this transfer</template>
      <template #content>
        <Button
          icon="pi pi-plus"
          label="Create Job"
          class="mb-2"
          @click="creating = true" />
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          class="ml-2"
          @click="getJobs(props.transferId)" />
        <DataTable
          v-model:selection="selectedJob"
          :value="jobs"
          selection-mode="single"
          sort-field="metadata.creationTimestamp"
          :sort-order="-1"
          @row-select="onRowSelectJob">
          <Column field="name" header="Name">
            <template #body="props">
              <span>{{ props.data.metadata?.name }}</span>
            </template>
          </Column>
          <Column field="imageName" header="Image Name">
            <template #body="props">
              <span>{{
                props.data.spec?.template?.spec?.containers[0]?.image
              }}</span>
            </template>
          </Column>
          <Column field="started" header="Started">
            <template #body="props">
              <span>{{
                new Date(
                  props.data.metadata?.creationTimestamp
                ).toLocaleString()
              }}</span>
            </template></Column
          >
          <Column field="conditions" header="Conditions">
            <template #body="props">
              <Tag
                class="min-w-24"
                :severity="determineSeverity(props.data.status)"
                :value="determineStatus(props.data.status)"></Tag>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Card v-if="selectedJob" class="mt-5">
      <template #title>Pods</template>
      <template #subtitle
        >Pods for <b>{{ selectedJob?.metadata?.name }}</b> with image name
        <b>{{
          selectedJob?.spec?.template?.spec?.containers[0]?.image
        }}</b></template
      >
      <template #content>
        <DataTable
          v-model:selection="selectedPod"
          :value="pods"
          selection-mode="single"
          sort-field="metadata.creationTimestamp"
          :sort-order="-1"
          @row-select="onRowSelectPod">
          <Column field="name" header="Name">
            <template #body="props">
              <span>{{ props.data.metadata?.name }}</span>
            </template>
          </Column>
          <Column field="imageName" header="Image Name">
            <template #body="props">
              <span>{{
                selectedJob?.spec?.template?.spec?.containers[0]?.image ??
                props.data.spec?.containers[0]?.image
              }}</span>
            </template>
          </Column>
          <Column field="started" header="Started">
            <template #body="props">
              <span>{{
                new Date(
                  props.data.metadata?.creationTimestamp
                ).toLocaleString()
              }}</span>
            </template></Column
          >
          <Column field="conditions" header="Conditions">
            <template #body="props">
              <Tag
                class="min-w-24"
                :severity="determinePodSeverity(props.data.status)"
                :value="determinePodStatus(props.data.status)"></Tag>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Card v-if="selectedPod" class="mt-5">
      <template #title>Logs</template>
      <template #subtitle
        >Logs for <b>{{ selectedPod?.metadata?.name }}</b> with image name
        <b>{{
          selectedJob?.spec?.template?.spec?.containers[0]?.image
        }}</b></template
      >
      <template #content>
        <MonacoEditorVue v-if="logs" :static="logs" :read-only="true" />
        <Skeleton v-if="!logs" height="12rem" />
      </template>
    </Card>
  </div>
</template>
