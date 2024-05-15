<script setup lang="ts">
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { computed } from 'vue';

const model = defineModel({type: String})

const editorHeight = computed(() => {
  const lines = model.value?.split('\n')?.length || 0;
  const height = Math.min(Math.max(lines, 10, 25));
  return `${height}rem`;
})
</script>

<template>
  <vue-monaco-editor
    v-model:value="model"
    theme="vs-dark"
    :options="{
      automaticLayout: true,
      formatOnType: true,
      formatOnPaste: true,
      tabSize: 2,
    }"
    language="json"
    :height="editorHeight"
    />
</template>