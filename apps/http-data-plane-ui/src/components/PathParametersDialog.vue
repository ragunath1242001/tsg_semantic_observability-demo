<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { inject, onBeforeMount, ref } from "vue";

import { DereferencedParameterObject } from "../utils/openapi.parser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dialogRef = inject("dialogRef") as any;
const parameters = ref<DereferencedParameterObject[]>([]);
const values = ref<Record<string, string>>({});

onBeforeMount(() => {
  parameters.value = dialogRef.value.data.parameters;
});

const placeholder = (param: DereferencedParameterObject): string => {
  if (param.schema?.example) {
    return String(param.schema.example);
  } else if (param.example) {
    return String(param.example);
  } else if (param.schema?.default) {
    return String(param.schema.default);
  } else {
    return param.name;
  }
};

const handleSubmit = () => {
  dialogRef.value.close(values.value);
};

const handleCancel = () => {
  dialogRef.value.close(null);
};
</script>

<template>
  <div class="flex flex-col gap-4" style="min-width: 500px">
    <div v-for="param in parameters" :key="param.name">
      <FormField
        :label="'{' + param.name + '}'"
        :help-text="param.description"
        :required="param.required">
        <InputText
          v-model="values[param.name]"
          :placeholder="placeholder(param)"
          class="w-full" />
        <small v-if="param.schema?.type" class="text-surface-500">
          Type: {{ param.schema.type }}
          <span v-if="param.schema.format"> ({{ param.schema.format }})</span>
        </small>
        <Message
          v-if="param.description"
          severity="info"
          class="mt-2"
          size="small"
          >{{ param.description }}</Message
        >
      </FormField>
    </div>
    <div class="flex gap-2 justify-end">
      <Button label="Cancel" severity="secondary" @click="handleCancel" />
      <Button label="OK" @click="handleSubmit" />
    </div>
  </div>
</template>
