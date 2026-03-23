<script setup lang="ts">
import type { AuditLogEntry } from "../composables/useAuditLogs";
import {
  actionSeverity,
  callerToolTip,
  callerTypeIcon,
  severitySeverity
} from "../utils/audit-log";
import { formatDate } from "../utils/date";

defineProps<{
  entry: AuditLogEntry;
  expanded: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
}>();

const showRemoteIcon = (serviceName?: string) => {
  return ["remote-wallet", "remote-control-plane"].includes(serviceName ?? "");
};
</script>

<template>
  <div
    class="px-4 py-3 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
    @click="emit('toggle')">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div class="flex items-center gap-2 shrink-0">
        <Button
          :icon="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
          text
          rounded
          size="small"
          @click.stop="emit('toggle')" />
        <span class="text-sm text-surface-500">
          {{ formatDate(entry.timestamp, true) }}
        </span>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <i
          v-tooltip.top="entry.resultAllowed ? 'Allowed' : 'Denied'"
          :class="[
            'pi text-sm px-2',
            entry.resultAllowed
              ? 'pi-shield text-green-500'
              : 'pi-lock text-red-500'
          ]" />
        <Tag
          :severity="severitySeverity(entry.severity)"
          :value="entry.severity.toUpperCase()"
          class="text-xs w-20 inline-block" />
        <Tag
          :severity="actionSeverity(entry.action)"
          :value="entry.action.toUpperCase()"
          class="text-xs w-20 inline-block" />
      </div>

      <code class="text-sm truncate min-w-0">{{ entry.resourceType }}</code>
      <span
        v-if="entry.resourceId"
        class="text-surface-400 text-xs truncate min-w-0 hidden lg:inline">
        ({{ entry.resourceId }})
      </span>

      <div class="flex-1 min-w-2" />

      <span
        v-if="entry.onBehalfOfUsername"
        v-tooltip.top="'On behalf of'"
        class="text-xs text-surface-400 shrink-0 hidden md:inline">
        <i class="pi pi-user mr-1 text-xs!" />{{ entry.onBehalfOfUsername }}
        <i class="pi pi-arrow-right text-xs! pl-2"></i>
      </span>

      <div class="flex items-center gap-1.5 shrink-0 ml-auto md:ml-0">
        <span
          class="text-sm text-surface-500 truncate max-w-32 lg:max-w-48 xl:max-w-64">
          <i
            v-if="showRemoteIcon(entry.callerServiceName)"
            v-tooltip.top="'Remote party'"
            class="pi pi-globe text-xs! mr-2 text-amber-600" />
          <i
            v-tooltip.top="callerToolTip(entry.callerType)"
            class="pi text-xs! mr-1"
            :class="callerTypeIcon(entry.callerType)" />
          <span class="pt-1">{{
            entry.callerUsername || entry.callerSub
          }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
