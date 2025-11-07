<script setup lang="ts">
import {
  AlgorithmInstanceDto,
  InternalEventDto,
  UITemplate
} from "@tsg-dsp/analytics-data-plane-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { formatDate, formatRelative } from "@tsg-dsp/common-ui/utils/date";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useToast } from "primevue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import AlgorithmUIComponent from "../../components/event-ui/AlgorithmUIComponent.vue";
import JobComponent from "../../components/JobComponent.vue";
import { useAlgorithmInstancesStore } from "../../stores/algorithm-instances";
import { getStatusSeverity } from "../../utils/algorithm-instance-status";
import { triggerBlobDownload } from "../../utils/downloadBlob";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const algorithmInstancesStore = useAlgorithmInstancesStore();

const showAlgorithmEvents = ref(true);
const showInternalEvents = ref(false);

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
    ...(showAlgorithmEvents.value
      ? instanceEvents.algorithmEvents.map((event) => ({
          ...event,
          type: "algorithm" as const
        }))
      : []),
    ...(showInternalEvents.value
      ? instanceEvents.internalEvents.map((event) => ({
          ...event,
          type: "internal" as const
        }))
      : [])
  ].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return allEvents;
});

const internalEventsFormatted = computed(() => {
  const mappedEvents = algorithmInstancesStore
    .getEventsForAlgorithmInstance(algorithmInstanceId)
    .internalEvents.reduce(
      (acc, event) => {
        if (!acc[event.name]) {
          acc[event.name] = [];
        }
        acc[event.name].push(event);
        return acc;
      },
      {} as Record<string, Array<InternalEventDto>>
    );
  return (
    (algorithmInstance.value?.algorithmDefinition.uiTemplate
      .map((uiElement) => {
        if (mappedEvents[uiElement.metric]) {
          return {
            uiTemplate: uiElement,
            eventName: uiElement.metric,
            data: mappedEvents[uiElement.metric]
          };
        }
      })
      .filter((e) => e !== undefined) as Array<{
      uiTemplate: UITemplate;
      eventName: string;
      data: Array<InternalEventDto>;
    }>) || []
  );
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

const fetchAlgorithmEventData = async (
  algorithmInstanceId: string,
  eventId: string
): Promise<Blob | null> => {
  try {
    const response = await http.get(
      `management/algorithm-instances/${algorithmInstanceId}/events/${eventId}/data`,
      {
        responseType: "blob"
      }
    );

    if (response.status === 204) return null;

    return response.data as Blob;
  } catch (error) {
    console.error(
      `Error downloading event data for ${algorithmInstanceId}/${eventId}:`,
      error
    );
    throw error;
  }
};

// Track which event is being downloaded
const downloadingEventIds = ref<Set<string>>(new Set());

const downloadEvent = async (event: any) => {
  if (event.type !== "algorithm" || !event.eventId) {
    toast.add({
      severity: "warn",
      summary: "Download unavailable",
      detail: "Only algorithm events with an eventId have downloadable data",
      life: 2500
    });
    return;
  }
  if (downloadingEventIds.value.has(event.eventId)) return;
  downloadingEventIds.value.add(event.eventId);
  try {
    const blob = await fetchAlgorithmEventData(
      algorithmInstanceId,
      event.eventId
    );
    if (!blob) {
      toast.add({
        severity: "info",
        summary: "No Data",
        detail: "This event has no associated data",
        life: 2500
      });
      return;
    }

    let extension = "bin";
    try {
      const headChar = await blob.slice(0, 1).text();
      if (headChar === "{" || headChar === "[") {
        extension = "json";
      }
    } catch {
      // ignore and keep default extension
    }
    const safeNamePart = (event.name || "event").replace(
      /[^a-zA-Z0-9-_]+/g,
      "-"
    );
    const filename = `${event.eventId}-${safeNamePart}.${extension}`;
    triggerBlobDownload(blob, filename);
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Download failed",
        defaultMessage: "Could not download event data"
      })
    );
  } finally {
    downloadingEventIds.value.delete(event.eventId);
  }
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
  <div class="grid grid-cols-12 gap-4">
    <div class="col-span-12 flex justify-between items-center">
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
      </div>
    </div>
    <Card class="col-span-12">
      <template #title>
        <div class="flex justify-between items-center">
          <span>{{ algorithmInstance?.algorithmDefinition.title }}</span>
          <Tag
            v-if="algorithmInstance?.status"
            :severity="getStatusSeverity(algorithmInstance.status)"
            :value="algorithmInstance.status" />
        </div>
      </template>

      <template #content>
        <div class="grid grid-cols-12">
          <div class="col-span-12 xl:col-span-6">
            <FormField label="ID">
              <code class="text-xs">{{ algorithmInstance?.id }}</code>
            </FormField>
            <FormField v-if="algorithmInstance?.createdDate" label="Created">
              <span>
                {{ formatRelative(algorithmInstance.createdDate) }}
                <small class="ml-3 text-500">{{
                  formatDate(algorithmInstance.createdDate)
                }}</small>
              </span>
            </FormField>
            <FormField v-if="algorithmInstance?.startedAt" label="Started">
              <span>
                {{ formatRelative(algorithmInstance.startedAt) }}
                <small class="ml-3 text-500">{{
                  formatDate(algorithmInstance.startedAt)
                }}</small>
              </span>
            </FormField>
            <FormField v-if="algorithmInstance?.finishedAt" label="Finished">
              <span>
                {{ formatRelative(algorithmInstance.finishedAt) }}
                <small class="ml-3 text-500">{{
                  formatDate(algorithmInstance.finishedAt)
                }}</small>
              </span>
            </FormField>
          </div>

          <div class="col-span-12 xl:col-span-6">
            <FormField label="Participants">
              <div class="flex flex-wrap gap-2">
                <Tag
                  v-for="participant in algorithmInstance?.participants || []"
                  :key="participant.didId"
                  :value="`${participant.didId} (${participant.role})`"
                  severity="info" />
              </div>
            </FormField>
          </div>
        </div>
      </template>
    </Card>
    <JobComponent
      class="col-span-12"
      :algorithm-instance-id="algorithmInstanceId"
      :debug="false" />

    <div class="col-span-12 columns-1 xl:columns-2 gap-4">
      <AlgorithmUIComponent
        v-for="element in internalEventsFormatted"
        :key="element.eventName"
        class="mb-4 break-inside-avoid"
        :event-name="element.eventName"
        :ui-template="element.uiTemplate"
        :data="element.data" />
    </div>
    <Card class="col-span-12">
      <template #title>
        <div class="flex justify-between items-center">
          <span>Events</span>
          <div class="flex gap-2 items-center">
            <Tag
              :value="`${showAlgorithmEvents ? events.filter((e) => e.type === 'algorithm').length : 'Show'} Algorithm`"
              :severity="showAlgorithmEvents ? 'info' : 'secondary'"
              class="cursor-pointer"
              @click="showAlgorithmEvents = !showAlgorithmEvents" />
            <Tag
              :value="`${showInternalEvents ? events.filter((e) => e.type === 'internal').length : 'Show'} Internal`"
              :severity="showInternalEvents ? 'success' : 'secondary'"
              class="cursor-pointer"
              @click="showInternalEvents = !showInternalEvents" />
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
          :sort-order="-1"
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
              <div class="flex items-center gap-2">
                <Tag
                  :value="getEventTypeLabel(props.data.type)"
                  :severity="getEventTypeSeverity(props.data.type)" />
                <template v-if="props.data.type === 'algorithm'">
                  <Tag
                    v-if="props.data.recipients?.length"
                    value="Sent"
                    severity="warn" />
                  <Tag v-else value="Received" severity="success" />
                </template>
              </div>
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

          <Column header="Details">
            <template #body="props">
              <template v-if="props.data.type === 'algorithm'">
                <template v-if="props.data.recipients?.length">
                  <div
                    v-if="props.data.recipients?.length"
                    class="flex flex-wrap gap-1">
                    <Tag
                      v-for="recipient in props.data.recipients"
                      :key="recipient"
                      v-tooltip.bottom="'Sent event to ' + recipient"
                      :value="recipient"
                      severity="secondary"
                      icon="pi pi-cloud-upload"
                      class="text-xs" />
                  </div>
                </template>
                <template v-else>
                  <Tag
                    v-tooltip.bottom="
                      'Received event from ' + props.data.createdBy
                    "
                    :value="props.data.createdBy"
                    class="text-xs"
                    icon="pi pi-cloud-download"
                    severity="info" />
                </template>
              </template>
              <template v-else>
                <code class="text-sm">{{
                  props.data.data?.value ?? "No description"
                }}</code>
              </template>
            </template>
          </Column>

          <Column header="">
            <template #body="props">
              <div class="flex items-center justify-end">
                <Button
                  v-tooltip.bottom="
                    props.data.type === 'algorithm' && props.data.eventId
                      ? 'Download event data'
                      : 'No downloadable data'
                  "
                  icon="pi pi-download"
                  size="small"
                  text
                  rounded
                  :disabled="
                    props.data.type !== 'algorithm' ||
                    !props.data.eventId ||
                    downloadingEventIds.has(props.data.eventId)
                  "
                  :loading="
                    props.data.eventId &&
                    downloadingEventIds.has(props.data.eventId)
                  "
                  @click="downloadEvent(props.data)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.p-button.p-button-link {
  text-decoration: none;
}
</style>
