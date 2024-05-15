<script setup lang="ts">
import { MonacoEditor, VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { computed } from 'vue';

const model = defineModel({type: String})
const props = defineProps<{
  schema?: any
}>();

const editorHeight = computed(() => {
  const lines = model.value?.split('\n')?.length || 0;
  const height = Math.min(Math.max(lines, 10, 25));
  return `${height}rem`;
});

const handleBeforeMount = (monaco: MonacoEditor) => {
  if (props.schema) {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [{
        uri: 'http://example/schema.json',
        fileMatch: ['**'],
        schema: JSON.parse(JSON.stringify(props.schema))
      }],
      enableSchemaRequest: false,
      schemaRequest: 'ignore',
      schemaValidation: 'error'
    })
  }
}

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
    :defaultPath="props.schema"
    language="json"
    :height="editorHeight"
    @beforeMount="handleBeforeMount"
    />
</template>