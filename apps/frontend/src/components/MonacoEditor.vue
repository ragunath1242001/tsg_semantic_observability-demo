<script setup lang="ts">
import { MonacoEditor, VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { computed } from 'vue';

const model = defineModel({ type: String, required: false })
const props = defineProps({
  schema: {
    type: Object,
    required: false
  },
  readOnly: {
    type: Boolean,
    required: false,
    default: false
  },
  minLines: {
    type: Number,
    required: false,
    default: 10
  },
  maxLines: {
    type: Number,
    required: false,
    default: 10
  },
  static: {
    required: false
  },
  raw: {
    type: Boolean,
    required: false,
    default: false
  }
});

if (props.static) {
  if (typeof props.static === "string") {
    model.value = props.static;
  } else {
    model.value = JSON.stringify(props.static, null, 2)
  }
}

const editorHeight = computed(() => {
  const lines = model.value?.split('\n')?.length || 0;
  const height = Math.min(Math.max(lines, props.minLines), props.maxLines);
  return `${Math.ceil(height * 1.3)}rem`;
});

const handleBeforeMount = (monaco: MonacoEditor) => {
  monaco.editor.defineTheme('transparant', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1f2937'
    }
  })
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
  } else if (!props.raw) {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemaValidation: 'ignore'
    })
  }
}

</script>

<template>
  <vue-monaco-editor v-model:value="model" theme="transparant" class="surface-border border-1" :options="{
    automaticLayout: true,
    formatOnType: true,
    formatOnPaste: true,
    tabSize: 2,
    readOnly: readOnly,
    readOnlyMessage: {
      value: null
    },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  }" :language="props.raw ? undefined : 'json'" :height="editorHeight" @beforeMount="handleBeforeMount" />
</template>