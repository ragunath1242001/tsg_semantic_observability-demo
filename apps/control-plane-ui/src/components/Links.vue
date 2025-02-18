<script setup lang="ts">
import { toRefs } from "vue";

const props = defineProps<{
  urlArray?: string[];
  label: string;
}>();
const { urlArray, label } = toRefs(props);
</script>
<template>
  <div v-if="urlArray && urlArray.length > 0">
    {{ label }}
    <a
      v-for="(url, index) in urlArray"
      :key="index"
      v-tooltip="url"
      :href="url"
      target="_blank">
      <i class="mx-2 pi pi-external-link text-blue-500"> </i>
    </a>
  </div>
</template>
