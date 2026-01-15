<script setup lang="ts">
import { MonacoEditor, VueMonacoEditor } from "@guolao/vue-monaco-editor";
import { computed } from "vue";

import { useLayout } from "../layout/composables/layout";

const { layoutConfig } = useLayout();

const uuid = crypto.randomUUID();

const model = defineModel({ type: String, required: false });
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
  }
});

if (props.static) {
  if (typeof props.static === "string") {
    model.value = props.static;
  } else {
    model.value = JSON.stringify(props.static, null, 2);
  }
}

const editorHeight = computed(() => {
  const lines = model.value?.split("\n")?.length || 0;
  const height = Math.min(Math.max(lines, props.minLines), props.maxLines);
  return `${Math.ceil(height * 1.3)}rem`;
});

const computeTheme = () => {
  return layoutConfig.darkTheme ? "vs-dark" : "vs";
};

const handleBeforeMount = (monaco: MonacoEditor) => {
  monaco.editor.defineTheme("transparant", {
    base: computeTheme(),
    inherit: true,
    rules: [],
    colors: {
      "editor.background": layoutConfig.darkTheme ? "#1f2937" : "#ffffff"
    }
  });
  const jsonDefaults = monaco.languages.json.jsonDefaults;
  if (props.schema) {
    jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        ...(jsonDefaults.diagnosticsOptions.schemas ?? []),
        {
          uri: `http://example/${uuid}.json`,
          fileMatch: [`${uuid}.json`],
          schema: JSON.parse(JSON.stringify(props.schema))
        }
      ],
      enableSchemaRequest: false,
      schemaRequest: "ignore",
      schemaValidation: "error"
    });
  } else {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: jsonDefaults.diagnosticsOptions.schemas,
      enableSchemaRequest: false,
      schemaRequest: "ignore",
      schemaValidation: "error"
    });
  }
};
</script>

<template>
  <vue-monaco-editor
    v-model:value="model"
    theme="transparant"
    :path="`/models/${uuid}.json`"
    :options="{
      automaticLayout: true,
      formatOnType: true,
      formatOnPaste: true,
      tabSize: 2,
      readOnly: readOnly,
      readOnlyMessage: {
        value: ''
      },
      scrollBeyondLastLine: false
    }"
    language="json"
    :height="editorHeight"
    @before-mount="handleBeforeMount" />
</template>
