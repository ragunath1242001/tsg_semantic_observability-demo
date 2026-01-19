<script setup lang="ts">
import Button from "primevue/button";

import { downloadRecoveryCodes } from "../utils/download";

interface Props {
  recoveryCodes: string[];
  showContinueButton?: boolean;
  continueButtonLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showContinueButton: true,
  continueButtonLabel: "I've Saved My Codes, Continue"
});

defineEmits<{
  continue: [];
}>();

const handleDownload = () => {
  downloadRecoveryCodes(props.recoveryCodes);
};
</script>
<template>
  <div>
    <div
      class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
      <i
        class="pi pi-exclamation-triangle text-yellow-600 dark:text-yellow-400 text-2xl mb-2"></i>
      <p class="text-yellow-800 dark:text-yellow-200 font-semibold mb-2">
        Important: Save these codes now!
      </p>
      <p class="text-yellow-700 dark:text-yellow-300 text-sm">
        Each code can only be used once. Store them in a safe place.
      </p>
    </div>
    <div
      class="bg-surface-100 dark:bg-surface-800 p-4 rounded border border-surface-300 dark:border-surface-700 mb-6">
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="(code, index) in recoveryCodes"
          :key="index"
          class="bg-surface-0 dark:bg-surface-900 p-3 rounded border border-surface-200 dark:border-surface-800">
          <code
            class="text-surface-900 dark:text-surface-0 font-mono font-semibold"
            >{{ code }}</code
          >
        </div>
      </div>
    </div>
    <Button
      label="Download Codes"
      icon="pi pi-download"
      class="w-full mb-2"
      severity="secondary"
      @click="handleDownload"></Button>
    <Button
      v-if="showContinueButton"
      :label="continueButtonLabel"
      class="w-full"
      @click="$emit('continue')"></Button>
  </div>
</template>
