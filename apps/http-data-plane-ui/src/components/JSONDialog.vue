<script setup lang="ts">
import { inject, onBeforeMount, onMounted, ref } from "vue";

const data = ref();
const note = ref<{ severity: string; message: string }>();
const dialogRef = inject("dialogRef") as any;

onBeforeMount(() => {
  if ("note" in dialogRef.value.data && "content" in dialogRef.value.data) {
    note.value = {
      severity: "info",
      ...dialogRef.value.data.note
    };
    data.value = dialogRef.value.data.content;
  } else {
    data.value = dialogRef.value.data;
  }
});
onMounted(() => {});
</script>

<template>
  <div style="width: 85vw">
    <MonacoEditorVue :static="data" :read-only="true" :max-lines="30" />
    <Message v-if="note" :severity="note.severity" class="mt-4">{{
      note.message
    }}</Message>
  </div>
</template>
