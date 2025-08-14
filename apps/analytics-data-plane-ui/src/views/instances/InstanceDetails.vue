<script setup lang="ts">
import { AlgorithmInstanceDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { formatDate, formatRelative } from "@tsg-dsp/common-ui/utils/date";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { useToast } from "primevue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAlgorithmInstancesStore } from "../../stores/algorithm-instances";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const algorithmInstancesStore = useAlgorithmInstancesStore();

const algorithmInstanceId = route.params.id as string;
const algorithmInstance = ref<AlgorithmInstanceDto>();
const refreshing = ref(false);
const autoRefresh = ref(true);
const refreshInterval = ref<ReturnType<typeof setTimeout>>();
const lastEventCount = ref(0);

const events = computed(() => {
  const instanceEvents =
    algorithmInstancesStore.getEventsForAlgorithmInstance(algorithmInstanceId);

  // Combine algorithm and internal events and sort by timestamp
  const allEvents = [
    ...instanceEvents.algorithmEvents.map((event) => ({
      ...event,
      type: "algorithm" as const
    })),
    ...instanceEvents.internalEvents.map((event) => ({
      ...event,
      type: "internal" as const
    }))
  ].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return allEvents;
});

const formatTimestamp = (timestamp: string | Date) => {
  return new Date(timestamp).toLocaleString();
};

const getEventTypeLabel = (type: string) => {
  return type === "algorithm" ? "Algorithm" : "Internal";
};

const getEventTypeSeverity = (type: string) => {
  return type === "algorithm" ? "info" : "success";
};

const isOwnEventSeverity = (isOwnEvent: boolean) => {
  return isOwnEvent ? "success" : "secondary";
};

const loadAlgorithmInstance = async () => {
  try {
    algorithmInstance.value =
      await algorithmInstancesStore.fetchAlgorithmInstanceById(
        algorithmInstanceId
      );
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading algorithm instance failed",
        defaultMessage: "Could not load algorithm instance details"
      })
    );
  }
};

const loadEvents = async () => {
  try {
    await algorithmInstancesStore.fetchEventsForAlgorithmInstance(
      algorithmInstanceId
    );
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading events failed",
        defaultMessage: "Could not load algorithm instance events"
      })
    );
  }
};

const refreshData = async () => {
  refreshing.value = true;
  try {
    await Promise.all([loadAlgorithmInstance(), loadEvents()]);
  } finally {
    refreshing.value = false;
  }
};

const refreshEventsOnly = async () => {
  // Silent refresh for polling - only load events without showing loading state
  try {
    await algorithmInstancesStore.fetchEventsForAlgorithmInstance(
      algorithmInstanceId,
      true
    ); // silent = true

    // Check if new events were added and show notification
    const currentEventCount = events.value.length;
    if (lastEventCount.value > 0 && currentEventCount > lastEventCount.value) {
      const newEventsCount = currentEventCount - lastEventCount.value;
      toast.add({
        severity: "info",
        summary: "New Events",
        detail: `${newEventsCount} new event${newEventsCount > 1 ? "s" : ""} added to the algorithm instance`,
        life: 3000
      });
    }
    lastEventCount.value = currentEventCount;
  } catch (error) {
    // Silently handle errors during polling
    console.warn("Failed to refresh events:", error);
  }
};

const setupAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }

  if (autoRefresh.value) {
    // Poll for new events every five seconds
    refreshInterval.value = setInterval(refreshEventsOnly, 5000);
  }
};

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  setupAutoRefresh();
};

const goBack = () => {
  router.push({ name: "algorithm-instances" });
};

const viewJobs = () => {
  router.push({ name: "job-debug", query: { algorithmInstanceId } });
};

onMounted(async () => {
  await refreshData();
  // Set initial event count for future comparison
  lastEventCount.value = events.value.length;
  setupAutoRefresh();
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});
</script>

<template>
  <div class="grid">
    <div class="col-span-12">
      <div class="flex justify-between items-center mb-4">
        <Button
          icon="pi pi-arrow-left"
          label="Back to Instances"
          outlined
          @click="goBack" />

        <div class="flex gap-2">
          <Button
            :icon="autoRefresh ? 'pi pi-pause' : 'pi pi-play'"
            :label="autoRefresh ? 'Stop Auto-refresh' : 'Start Auto-refresh'"
            :severity="autoRefresh ? 'secondary' : 'success'"
            outlined
            @click="toggleAutoRefresh" />

          <Button
            icon="pi pi-refresh"
            label="Refresh Now"
            :loading="refreshing"
            @click="refreshData" />

          <Button
            icon="pi pi-cog"
            label="View Jobs"
            outlined
            @click="viewJobs" />
        </div>
      </div>

      <!-- Algorithm Instance Overview Card -->
      <Card class="mb-4">
        <template #title>
          <div class="flex justify-between items-center">
            <span>{{ algorithmInstance?.algorithmDefinition.title }}</span>
            <Tag
              v-if="algorithmInstance?.status"
              :severity="
                algorithmInstance.status === 'completed'
                  ? 'success'
                  : algorithmInstance.status === 'running'
                    ? 'info'
                    : algorithmInstance.status === 'failed'
                      ? 'danger'
                      : 'warning'
              "
              :value="algorithmInstance.status" />
          </div>
        </template>

        <template #content>
          <div class="grid">
            <div class="col-span-12 md:col-span-6">
              <h3 class="text-xl font-medium mb-3">Instance Details</h3>
              <div class="grid">
                <div class="col-span-12">
                  <label class="block font-medium mb-2">ID</label>
                  <code class="text-sm">{{ algorithmInstance?.id }}</code>
                </div>
                <div v-if="algorithmInstance?.createdDate" class="col-span-12">
                  <label class="block font-medium mb-2">Created At</label>
                  <span
                    >{{ formatRelative(algorithmInstance.createdDate) }}
                    <small class="ml-3">{{
                      formatDate(algorithmInstance.createdDate)
                    }}</small>
                  </span>
                </div>
                <div v-if="algorithmInstance?.startedAt" class="col-span-12">
                  <label class="block font-medium mb-2">Started At</label>

                  <span
                    >{{ formatRelative(algorithmInstance.startedAt) }}
                    <small class="ml-3">{{
                      formatDate(algorithmInstance.startedAt)
                    }}</small>
                  </span>
                </div>
                <div v-if="algorithmInstance?.finishedAt" class="col-span-12">
                  <label class="block font-medium mb-2">Finished At</label>
                  <span
                    >{{ formatRelative(algorithmInstance.finishedAt) }}
                    <small class="ml-3">{{
                      formatDate(algorithmInstance.finishedAt)
                    }}</small>
                  </span>
                </div>
              </div>
            </div>

            <div class="col-span-12 md:col-span-6">
              <h6 class="text-xl font-medium mb-3">Participants</h6>
              <div class="flex flex-wrap gap-2">
                <Tag
                  v-for="participant in algorithmInstance?.participants || []"
                  :key="participant.didId"
                  :value="`${participant.didId} (${participant.role})`"
                  severity="info" />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Events Card -->
      <Card>
        <template #title>
          <div class="flex justify-between items-center">
            <span>Events</span>
            <div class="flex gap-2">
              <Tag
                :value="`${events.filter((e) => e.type === 'algorithm').length} Algorithm`"
                severity="info" />
              <Tag
                :value="`${events.filter((e) => e.type === 'internal').length} Internal`"
                severity="success" />
            </div>
          </div>
        </template>

        <template #content>
          <DataTable
            :value="events"
            :loading="algorithmInstancesStore.eventsLoading"
            paginator
            :rows="20"
            :rows-per-page-options="[10, 20, 50]"
            table-style="min-width: 50rem"
            sort-field="timestamp"
            :sort-order="1"
            class="p-datatable-sm">
            <template #empty>
              <div class="text-center py-4">
                <i class="pi pi-info-circle text-3xl text-400 mb-3"></i>
                <p class="text-500">
                  No events found for this algorithm instance.
                </p>
              </div>
            </template>

            <Column field="timestamp" header="Timestamp" sortable>
              <template #body="props">
                <span class="text-sm">{{
                  formatTimestamp(props.data.timestamp)
                }}</span>
              </template>
            </Column>

            <Column field="type" header="Type" sortable>
              <template #body="props">
                <Tag
                  :value="getEventTypeLabel(props.data.type)"
                  :severity="getEventTypeSeverity(props.data.type)" />
              </template>
            </Column>

            <Column field="name" header="Event Name" sortable>
              <template #body="props">
                <span class="font-medium">{{ props.data.name }}</span>
              </template>
            </Column>

            <Column field="number" header="Number" sortable>
              <template #body="props">
                <Badge :value="props.data.number" />
              </template>
            </Column>

            <Column
              v-if="events.some((e) => e.type === 'algorithm')"
              field="eventId"
              header="Event ID">
              <template #body="props">
                <code v-if="props.data.eventId" class="text-xs">{{
                  props.data.eventId
                }}</code>
                <span v-else class="text-400">-</span>
              </template>
            </Column>

            <Column
              v-if="events.some((e) => e.type === 'algorithm')"
              field="isOwnEvent"
              header="Own Event">
              <template #body="props">
                <Tag
                  v-if="props.data.type === 'algorithm'"
                  :value="props.data.isOwnEvent ? 'Yes' : 'No'"
                  :severity="isOwnEventSeverity(props.data.isOwnEvent)" />
                <span v-else class="text-400">-</span>
              </template>
            </Column>

            <Column
              v-if="
                events.some(
                  (e) => e.type === 'algorithm' && e.recipients?.length
                )
              "
              field="recipients"
              header="Recipients">
              <template #body="props">
                <div
                  v-if="props.data.recipients?.length"
                  class="flex flex-wrap gap-1">
                  <Tag
                    v-for="recipient in props.data.recipients"
                    :key="recipient"
                    :value="recipient"
                    severity="secondary"
                    class="text-xs" />
                </div>
                <span v-else class="text-400">-</span>
              </template>
            </Column>

            <Column
              v-if="events.some((e) => e.type === 'algorithm')"
              field="createdBy"
              header="Created By">
              <template #body="props">
                <code v-if="props.data.createdBy" class="text-xs">{{
                  props.data.createdBy
                }}</code>
                <span v-else class="text-400">-</span>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.p-button.p-button-link {
  text-decoration: none;
}
</style>
