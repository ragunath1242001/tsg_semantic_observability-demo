<script setup lang="ts">
import { inject, onBeforeMount, onMounted, ref } from "vue";

const data = ref();
const dialogRef = inject("dialogRef") as any;

onBeforeMount(() => {
  data.value = dialogRef.value.data;
});
onMounted(() => {});
</script>

<template>
  <div style="width: 85vw">
    <MonacoEditorVue :static="data" :read-only="true" :max-lines="30" />
  </div>
</template>
