<script setup lang="ts">
import { useToast } from "primevue/usetoast";

import type { AuditLogEntry } from "../composables/useAuditLogs";
import { resultLabel, resultSeverity } from "../utils/audit-log";

defineProps<{
  entry: AuditLogEntry;
  compact?: boolean;
}>();

const toast = useToast();

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.add({
    severity: "info",
    summary: "Copied",
    detail: "Copied to clipboard",
    life: 2000
  });
};
</script>

<template>
  <div class="flex flex-col gap-3" :class="compact ? '' : 'p-4'">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
        class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
        <div
          class="flex items-center gap-2 mb-2 text-xs font-semibold text-surface-400 uppercase tracking-wide">
          <i class="pi pi-user" />
          Caller
        </div>
        <div class="flex flex-col gap-1.5 text-sm">
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs break-all">{{
              entry.callerSub
            }}</span>
            <Tag
              :value="entry.callerType"
              severity="secondary"
              class="text-xs shrink-0" />
          </div>
          <div v-if="entry.callerUsername" class="text-surface-500">
            <i class="pi pi-at text-xs mr-1" />{{ entry.callerUsername }}
          </div>
          <div v-if="entry.callerServiceName" class="text-surface-500">
            <i class="pi pi-server text-xs mr-1" />{{ entry.callerServiceName }}
          </div>
          <div
            v-if="entry.callerDidId"
            class="font-mono text-xs text-surface-400 break-all">
            DID: {{ entry.callerDidId }}
          </div>
        </div>
      </div>

      <div
        v-if="entry.onBehalfOfSub"
        class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
        <div
          class="flex items-center gap-2 mb-2 text-xs font-semibold text-surface-400 uppercase tracking-wide">
          <i class="pi pi-arrow-right-arrow-left" />
          On Behalf Of
        </div>
        <div class="flex flex-col gap-1.5 text-sm">
          <span class="font-mono text-xs break-all">{{
            entry.onBehalfOfSub
          }}</span>
          <div v-if="entry.onBehalfOfUsername" class="text-surface-500">
            <i class="pi pi-user text-xs mr-1" />{{ entry.onBehalfOfUsername }}
          </div>
          <div
            v-if="entry.onBehalfOfDidId"
            class="font-mono text-xs text-surface-400 break-all">
            DID: {{ entry.onBehalfOfDidId }}
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
        class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
        <div
          class="flex items-center gap-2 mb-2 text-xs font-semibold text-surface-400 uppercase tracking-wide">
          <i class="pi pi-globe" />
          Environment
        </div>
        <div class="flex flex-col gap-1.5 text-sm">
          <div v-if="entry.ipAddress">
            <span class="text-surface-400 text-xs">IP</span>
            <code class="ml-2">{{ entry.ipAddress }}</code>
          </div>
          <div v-if="entry.requestMethod">
            <span class="text-surface-400 text-xs">Request</span>
            <code class="ml-2 break-all"
              >{{ entry.requestMethod }} {{ entry.requestPath }}</code
            >
          </div>
          <div
            v-if="entry.userAgent"
            class="text-xs text-surface-400 break-all">
            {{ entry.userAgent }}
          </div>
        </div>
      </div>

      <div
        class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
        <div
          class="flex items-center gap-2 mb-2 text-xs font-semibold text-surface-400 uppercase tracking-wide">
          <i class="pi pi-check-circle" />
          Policy Result
        </div>
        <div class="flex flex-col gap-1.5 text-sm">
          <div class="flex items-center gap-2">
            <Tag
              :severity="resultSeverity(entry.resultAllowed)"
              :value="resultLabel(entry.resultAllowed)" />
          </div>
          <div v-if="entry.resultMatchedPermission">
            <span class="text-surface-400 text-xs">Permission</span>
            <code class="ml-2 text-xs break-all">{{
              entry.resultMatchedPermission
            }}</code>
          </div>
          <div v-if="entry.resultEffectiveScope">
            <span class="text-surface-400 text-xs">Scope</span>
            <code class="ml-2 text-xs">{{ entry.resultEffectiveScope }}</code>
          </div>
          <div v-if="entry.resultReason" class="text-surface-500 text-xs">
            {{ entry.resultReason }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="
        entry.correlationId ||
        (entry.delegationChain && entry.delegationChain.length)
      "
      class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm px-1">
      <div v-if="entry.correlationId" class="flex items-center gap-2">
        <span class="text-surface-400 text-xs">Correlation</span>
        <code class="text-xs">{{ entry.correlationId }}</code>
        <Button
          icon="pi pi-copy"
          text
          rounded
          size="small"
          class="w-6! h-6!"
          @click.stop="copyToClipboard(entry.correlationId)" />
      </div>
      <div
        v-if="entry.delegationChain && entry.delegationChain.length"
        class="flex items-center gap-2">
        <span class="text-surface-400 text-xs">Delegation</span>
        <div class="flex items-center gap-1 flex-wrap">
          <template
            v-for="(delegationEntry, index) in entry.delegationChain"
            :key="index">
            <code class="text-xs">{{ delegationEntry }}</code>
            <i
              v-if="index < entry.delegationChain.length - 1"
              class="pi pi-arrow-right text-xs text-surface-400" />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
