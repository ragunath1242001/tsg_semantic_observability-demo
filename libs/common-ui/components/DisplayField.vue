<script setup lang="ts">
const props = defineProps({
  label: String,
});
</script>

<template>
  <div class="col-12 md:col-6 p-3">
    <div class="text-surface-500 dark:text-surface-300 font-medium mb-2">
      {{ props.label }}
    </div>
    <div class="text-surface-900 dark:text-surface-0">
      <slot></slot>
    </div>
  </div>
</template>
