<script setup lang="ts">
import type {
  V1Job,
  V1JobStatus,
  V1Pod,
  V1PodStatus
} from "@kubernetes/client-node";
import { DataTableRowSelectEvent } from "primevue";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { useK8sStore } from "../stores/k8s";
import { useRuntimeStore } from "../stores/runtime";

const k8sStore = useK8sStore();
const runtimeStore = useRuntimeStore();

const { algorithmInstanceId } = defineProps<{
  algorithmInstanceId: string;
}>();

const autoRefreshEnabled = ref(true);
const countdownTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const countdownSeconds = ref(0);

const refreshIntervalMs = computed(
  () => runtimeStore.jobRefreshIntervalMs ?? 10000
);

const refreshIntervalSeconds = computed(() =>
  Math.round(refreshIntervalMs.value / 1000)
);

const allJobsFinished = computed(() => {
  if (jobs.value.length === 0) return false;
  return jobs.value.every(
    (job) => !job.status?.active || job.status.active === 0
  );
});

const autoRefreshLabel = computed(() => {
  if (!autoRefreshEnabled.value) return "Off";
  return `${Math.max(0, countdownSeconds.value - 1)}s`;
});

const scheduleTick = () => {
  countdownTimeout.value = setTimeout(async () => {
    if (!autoRefreshEnabled.value) return;

    if (countdownSeconds.value > 1) {
      countdownSeconds.value--;
      scheduleTick();
    } else {
      await getJobs(algorithmInstanceId);
      if (allJobsFinished.value) {
        autoRefreshEnabled.value = false;
        return;
      }
      countdownSeconds.value = refreshIntervalSeconds.value;
      scheduleTick();
    }
  }, 1000);
};

const startAutoRefresh = () => {
  stopAutoRefresh();
  if (refreshIntervalMs.value > 0) {
    countdownSeconds.value = refreshIntervalSeconds.value;
    scheduleTick();
  }
};

const stopAutoRefresh = () => {
  if (countdownTimeout.value) {
    clearTimeout(countdownTimeout.value);
    countdownTimeout.value = null;
  }
  countdownSeconds.value = 0;
};

watch(autoRefreshEnabled, (enabled) => {
  if (enabled) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

const jobs = ref<V1Job[]>([]);

const logs = ref<string>();

const pods = ref<V1Pod[]>([]);

const selectedJob = ref<V1Job>();

const selectedPod = ref<V1Pod>();

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
): "warn" | "info" | "success" | "danger" => {
  if ((status?.active ?? 0) >= 1) {
    return (status?.ready ?? 0) >= 1 ? "info" : "warn";
  } else if ((status?.succeeded ?? 0) >= 1) {
    return "success";
  } else if ((status?.failed ?? 0) >= 1) {
    return "danger";
  } else {
    return "danger";
  }
};

const determineStatus = (
  status?: V1JobStatus
): "Pending" | "Running" | "Completed" | "Failed" | "Unknown" => {
  if ((status?.active ?? 0) >= 1) {
    return (status?.ready ?? 0) >= 1 ? "Running" : "Pending";
  } else if ((status?.succeeded ?? 0) >= 1) {
    return "Completed";
  } else if ((status?.failed ?? 0) >= 1) {
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

onMounted(async () => {
  await getJobs(algorithmInstanceId);
  if (autoRefreshEnabled.value) {
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>
<template>
  <div>
    <Card>
      <template #title>
        <div class="flex justify-between items-center">
          <span>Jobs</span>
          <div class="flex items-center gap-2">
            <Button
              icon="pi pi-refresh"
              label="Refresh"
              size="small"
              @click="getJobs(algorithmInstanceId)" />
            <ToggleButton
              v-model="autoRefreshEnabled"
              v-tooltip.bottom="
                autoRefreshEnabled
                  ? `Auto-refresh every ${refreshIntervalMs / 1000}s`
                  : 'Auto-refresh disabled'
              "
              :on-label="autoRefreshLabel"
              off-label="Off"
              :on-icon="
                countdownSeconds < 2 ? 'pi pi-sync pi-spin' : 'pi pi-sync'
              "
              off-icon="pi pi-pause"
              :severity="autoRefreshEnabled ? undefined : 'secondary'"
              size="small" />
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
