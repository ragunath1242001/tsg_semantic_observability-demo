<script setup lang="ts">
import { ref } from "vue";

const props = defineProps({
  label: String,
});
</script>

<template>
  <div class="col-12 md:col-6 p-3">
    <div class="text-500 font-medium mb-2">
      {{ label }}
    </div>
    <div class="text-900">
      <slot></slot>
    </div>
  </div>
</template>
