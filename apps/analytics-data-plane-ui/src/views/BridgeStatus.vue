<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { formatDate, formatRelative } from "@tsg-dsp/common-ui/utils/date";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, onUnmounted, ref } from "vue";

import { useRuntimeStore } from "../stores/runtime";

interface ClientConnection {
  clientId: string;
  clientIpAddress?: string;
  status: "connected" | "disconnected";
  oauthClientId?: string;
  connectedAt: string;
  disconnectedAt?: string;
  lastMessageReceivedAt?: string;
  lastMessageSentAt?: string;
  uptimeMs: number;
}

interface ServerStatus {
  mode: string;
  clients: ClientConnection[];
}

interface ClientStatus {
  mode: string;
  status: "connected" | "disconnected" | "not-configured";
  oauthClientId?: string;
  serverUrl?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastMessageReceivedAt?: string;
  lastMessageSentAt?: string;
  reconnecting?: boolean;
  reconnectAttempts?: number;
  uptimeMs?: number;
}

const toast = useToast();
const runtimeStore = useRuntimeStore();

const serverStatus = ref<ServerStatus>();
const clientStatus = ref<ClientStatus>();
const loading = ref(false);
let pollTimer: ReturnType<typeof setInterval> | undefined;

const statusSeverity = computed(() => {
  if (runtimeStore.isServerMode) {
    return serverStatus.value &&
      serverStatus.value.clients.some((client) => client.status === "connected")
      ? "success"
      : "warn";
  }
  if (clientStatus.value?.status === "connected") return "success";
  if (clientStatus.value?.status === "disconnected") return "danger";
  return "warn";
});

const statusLabel = computed(() => {
  if (runtimeStore.isServerMode) {
    const count =
      serverStatus.value?.clients.filter(
        (client) => client.status === "connected"
      ).length ?? 0;
    return count > 0 ? `${count} client(s) connected` : "No clients connected";
  }
  if (clientStatus.value?.status === "connected") return "Connected";
  if (clientStatus.value?.status === "disconnected") return "Disconnected";
  return "Not configured";
});

async function fetchStatus() {
  try {
    loading.value = true;
    if (runtimeStore.isServerMode || runtimeStore.isStandaloneMode) {
      const response = await http.get<ServerStatus>("bridge/status");
      serverStatus.value = response.data;
    } else if (runtimeStore.isClientMode) {
      const response = await http.get<ClientStatus>("bridge/status");
      clientStatus.value = response.data;
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to load bridge status",
        defaultMessage: "Could not retrieve bridge connection status"
      })
    );
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await runtimeStore.ensureLoaded();
  await fetchStatus();
  pollTimer = setInterval(fetchStatus, 10000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <Card>
    <template #title>Bridge Connection Status</template>
    <template #subtitle>
      <Tag :severity="statusSeverity" :value="statusLabel" />
    </template>
    <template #content>
      <!-- Server mode: show connected clients -->
      <template
        v-if="runtimeStore.isServerMode || runtimeStore.isStandaloneMode">
        <div class="flex flex-col gap-4">
          <FormField label="Mode">{{ runtimeStore.mode }}</FormField>
        </div>

        <div
          v-if="serverStatus && serverStatus.clients.length > 0"
          class="mt-6">
          <DataView
            :value="serverStatus.clients"
            layout="list"
            paginator
            :rows="10"
            data-key="clientId"
            :pt="{
              root: { style: 'border-width: 0' },
              header: { style: 'display:none' },
              content: { style: 'background: transparent' }
            }">
            <template #list="slotProps">
              <div class="flex flex-col gap-4">
                <div
                  v-for="client in slotProps.items"
                  :key="`${client.clientId}-${client.connectedAt}`"
                  class="rounded-xl border border-surface-200 bg-surface-0 p-4 shadow-sm dark:border-surface-700 dark:bg-surface-900">
                  <div
                    class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div class="flex min-w-0 flex-col gap-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-semibold text-lg break-all">{{
                          client.clientId
                        }}</span>
                        <Tag
                          :severity="
                            client.status === 'connected' ? 'success' : 'danger'
                          "
                          :value="client.status" />
                      </div>
                      <div
                        class="text-sm text-surface-600 dark:text-surface-300">
                        Connected {{ formatDate(client.connectedAt) }}
                      </div>
                    </div>

                    <div
                      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 lg:min-w-136">
                      <div
                        v-if="client.clientIpAddress"
                        class="flex flex-col gap-1">
                        <span
                          class="text-xs uppercase tracking-wide text-surface-500"
                          >Client IP</span
                        >
                        <span class="font-medium break-all">{{
                          client.clientIpAddress
                        }}</span>
                      </div>
                      <div
                        v-if="client.oauthClientId"
                        class="flex flex-col gap-1">
                        <span
                          class="text-xs uppercase tracking-wide text-surface-500"
                          >OAuth Client</span
                        >
                        <span class="font-medium break-all">{{
                          client.oauthClientId
                        }}</span>
                      </div>
                      <div
                        v-if="client.status === 'connected'"
                        class="flex flex-col gap-1">
                        <span
                          class="text-xs uppercase tracking-wide text-surface-500"
                          >Uptime</span
                        >
                        <span class="font-medium">{{
                          formatRelative(client.connectedAt, true)
                        }}</span>
                      </div>
                      <div
                        v-if="client.lastMessageReceivedAt"
                        class="flex flex-col gap-1">
                        <span
                          class="text-xs uppercase tracking-wide text-surface-500"
                          >Last Message Received</span
                        >
                        <span class="font-medium">{{
                          formatDate(client.lastMessageReceivedAt)
                        }}</span>
                      </div>
                      <div
                        v-if="client.lastMessageSentAt"
                        class="flex flex-col gap-1">
                        <span
                          class="text-xs uppercase tracking-wide text-surface-500"
                          >Last Message Sent</span
                        >
                        <span class="font-medium">{{
                          formatDate(client.lastMessageSentAt)
                        }}</span>
                      </div>
                      <div
                        v-if="client.disconnectedAt"
                        class="flex flex-col gap-1">
                        <span
                          class="text-xs uppercase tracking-wide text-surface-500"
                          >Disconnected At</span
                        >
                        <span class="font-medium">{{
                          formatDate(client.disconnectedAt)
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </DataView>
        </div>
        <div v-else class="mt-4 text-surface-600">
          No bridge clients are currently connected.
        </div>
      </template>

      <!-- Client mode: show connection to server -->
      <template v-else-if="runtimeStore.isClientMode && clientStatus">
        <div class="flex flex-col gap-4">
          <FormField label="Mode">{{ clientStatus.mode }}</FormField>
          <FormField label="Server URL">{{
            clientStatus.serverUrl ?? "—"
          }}</FormField>
          <FormField label="Status">
            <Tag
              :severity="
                clientStatus.status === 'connected'
                  ? 'success'
                  : clientStatus.status === 'disconnected'
                    ? 'danger'
                    : 'warn'
              "
              :value="clientStatus.status" />
          </FormField>
          <FormField v-if="clientStatus.connectedAt" label="Connected Since">
            {{ formatDate(clientStatus.connectedAt) }}
          </FormField>
          <FormField
            v-if="clientStatus.disconnectedAt"
            label="Disconnected Since">
            {{ formatDate(clientStatus.disconnectedAt) }}
          </FormField>
          <FormField v-if="clientStatus.oauthClientId" label="OAuth Client">
            {{ clientStatus.oauthClientId }}
          </FormField>
          <FormField
            v-if="
              clientStatus.connectedAt != null &&
              clientStatus.status === 'connected'
            "
            label="Uptime">
            {{ formatRelative(clientStatus.connectedAt, true) }}
          </FormField>
          <FormField label="Last Message Received">
            {{ formatDate(clientStatus.lastMessageReceivedAt) }}
          </FormField>
          <FormField label="Last Message Sent">
            {{ formatDate(clientStatus.lastMessageSentAt) }}
          </FormField>
          <FormField v-if="clientStatus.reconnecting" label="Reconnecting">
            Yes (attempt {{ clientStatus.reconnectAttempts ?? "?" }})
          </FormField>
        </div>
      </template>
    </template>
  </Card>
</template>
