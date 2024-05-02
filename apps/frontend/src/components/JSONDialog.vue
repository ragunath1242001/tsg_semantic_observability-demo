<script setup lang="ts">
import { ref, onMounted, inject } from "vue";
import { JsonTreeView } from "json-tree-view-vue3";

const data = ref();
const dialogRef = inject("dialogRef") as any;

onMounted(() => {
    data.value = dialogRef.value.data;
});
</script>

<template>
  <div style="max-width: 85vw;">

    <JsonTreeView
      :data="JSON.stringify(data)"
      color-scheme="dark"
      root-key="Dataset"
      :max-depth="5"
    />
  </div>
</template>