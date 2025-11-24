<script setup lang="ts">
import type {
  V1Job,
  V1JobStatus,
  V1Pod,
  V1PodStatus
} from "@kubernetes/client-node";
import { FileMetadataDto } from "@tsg-dsp/analytics-data-plane-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { DataTableRowSelectEvent, useToast } from "primevue";
import { onMounted, ref } from "vue";

import { useK8sStore } from "../stores/k8s";

interface CreateJob {
  imageName: string;
  command?: string;
  fileId?: string;
}

const k8sStore = useK8sStore();
const toast = useToast();

const { algorithmInstanceId, debug } = defineProps<{
  algorithmInstanceId: string;
  debug: boolean;
}>();

const jobs = ref<V1Job[]>([]);

const logs = ref<string>();

const pods = ref<V1Pod[]>([]);

const selectedJob = ref<V1Job>();

const selectedPod = ref<V1Pod>();

const creating = ref(false);

const createJob = ref<CreateJob>({
  imageName:
    "registry.gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/adp-test-image",
  command: undefined,
  fileId: undefined
});

const filesList = ref<FileMetadataDto[]>([]);

const getJobs = async (algorithmInstanceId: string) => {
  try {
    const jobsData =
      await k8sStore.getJobsForAlgorithmInstance(algorithmInstanceId);
    jobs.value = jobsData;
    await getPods();
  } catch (error) {
    console.error("Error fetching jobs:", error);
  }
};

const getPods = async () => {
  if (!selectedJob.value) {
    return;
  }
  try {
    const podsData = await k8sStore.getJobPods(selectedJob.value.metadata.name);
    pods.value = podsData.items;
  } catch (error) {
    console.error("Error fetching pods:", error);
  }
};

const determineSeverity = (
  status?: V1JobStatus
): "warn" | "success" | "danger" => {
  if (status?.active >= 1) {
    return "warn";
  } else if (status?.succeeded >= 1) {
    return "success";
  } else if (status?.failed >= 1) {
    return "danger";
  } else {
    return "danger";
  }
};

const determineStatus = (
  status?: V1JobStatus
): "Pending" | "Completed" | "Failed" | "Unknown" => {
  if (status?.active >= 1) {
    return "Pending";
  } else if (status?.succeeded >= 1) {
    return "Completed";
  } else if (status?.failed >= 1) {
    return "Failed";
  } else {
    return "Unknown";
  }
};

const determinePodSeverity = (
  status?: V1PodStatus
): "warn" | "success" | "danger" => {
  if (status?.phase === "Pending") {
    return "warn";
  } else if (status?.phase === "Running") {
    return "success";
  } else if (status?.phase === "Succeeded") {
    return "success";
  } else if (status?.phase === "Failed") {
    return "danger";
  } else {
    return "danger";
  }
};

const determinePodStatus = (
  status?: V1PodStatus
): "Pending" | "Running" | "Failed" | "Succeeded" | "Unknown" => {
  if (status?.phase === "Pending") {
    return "Pending";
  } else if (status?.phase === "Running") {
    return "Running";
  } else if (status?.phase === "Succeeded") {
    return "Succeeded";
  } else if (status?.phase === "Failed") {
    return "Failed";
  } else {
    return "Unknown";
  }
};

const getLogs = async (podName: string) => {
  logs.value = undefined;
  try {
    const logsData = await k8sStore.getPodLogs(podName);
    logs.value = logsData;
  } catch (error) {
    console.error("Error fetching logs:", error);
  }
};

const onRowSelectJob = async () => {
  logs.value = undefined;
  selectedPod.value = undefined;
  await getPods();
};

const onRowSelectPod = async (event: DataTableRowSelectEvent<V1Pod>) => {
  await getLogs(event.data.metadata.name);
};

const spawnK8sJob = async () => {
  try {
    // Process the command properly - filter out empty strings
    let commandArray: string[] | undefined = undefined;
    if (createJob.value.command?.trim()) {
      commandArray = createJob.value.command
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    }

    await k8sStore.spawnJob(
      createJob.value.imageName,
      algorithmInstanceId,
      commandArray,
      createJob.value.fileId
    );
    toast.add({
      severity: "success",
      summary: "Job spawned",
      detail: "Job has been spawned successfully",
      life: 3000
    });
    creating.value = false;
    createJob.value = {
      imageName: "",
      command: undefined,
      fileId: undefined
    };
    await getJobs(algorithmInstanceId);
  } catch (error) {
    console.error("Error spawning job:", error);
    toast.add(
      toastError({
        error,
        summary: "Error spawning job",
        defaultMessage: "Could not spawn job for algorithm instance"
      })
    );
  }
};

const getFiles = async () => {
  try {
    const response = await http.get<FileMetadataDto[]>("files");
    filesList.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading state failed",
        defaultMessage: "Could not load state from the analytics data plane"
      })
    );
  }
};

onMounted(async () => {
  await Promise.allSettled([getJobs(algorithmInstanceId), getFiles()]);
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
          <InputText
            v-model="createJob.imageName"
            placeholder="e.g., fl-simulation, python:3.9, busybox"
            class="w-full" />
        </FormField>
      </div>
      <div class="flex-col items-center gap-4 mb-4">
        <FormField label="Command">
          <InputText
            id="command"
            v-model="createJob.command"
            aria-describedby="command-help"
            placeholder="python, src/fl_participant.py (leave empty for default command)"
            class="w-full" />

          <Message
            id="command-help"
            size="small"
            variant="simple"
            severity="secondary"
            >Command to run in the container, separate array entries with a
            comma. Leave empty to use the image's default command. Examples:
            "python, src/fl_participant.py" or "sh, -c, echo hello
            world"</Message
          >
        </FormField>
      </div>
      <div class="flex-col items-center gap-4 mb-4">
        <FormField label="File">
          <Select
            id="file"
            v-model="createJob.fileId"
            show-clear
            :options="filesList"
            option-label="originalFileName"
            option-value="identifier"
            aria-describedby="file-help"
            placeholder="No file selected"
            class="w-full" />
          <Message
            id="file-help"
            size="small"
            variant="simple"
            severity="secondary"
            >File to be used in job, leave empty for no file</Message
          >
        </FormField>
      </div>
      <div class="flex justify-end gap-2">
        <form @submit.prevent="spawnK8sJob">
          <Button type="submit" label="Create" />
        </form>
      </div>
    </Dialog>
    <Card>
      <template #title>
        <div class="flex justify-between items-center">
          <span>Jobs</span>
          <div>
            <Button
              v-if="debug"
              icon="pi pi-plus"
              label="Create Job"
              class="mb-2"
              size="small"
              @click="creating = true" />
            <Button
              icon="pi pi-refresh"
              label="Refresh"
              class="ml-2"
              size="small"
              @click="getJobs(algorithmInstanceId)" />
          </div>
        </div>
      </template>
      <template #content>
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
            </template>
          </Column>
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
