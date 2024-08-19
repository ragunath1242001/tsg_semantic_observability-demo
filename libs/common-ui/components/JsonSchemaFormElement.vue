<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import FormField from "./FormField.vue";
import ToggleButton from "primevue/togglebutton";

const emit = defineEmits(["input"]);

const valueRef = ref();
const typeRef = ref<string>();

watch(valueRef, (newValue) => {
  emit("input", newValue);
});

const props = defineProps({
  schema: {
    type: Object,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  didId: {
    type: String,
    required: false,
  },
  required: {
    type: Boolean,
    required: true,
  },
});

const parsedProperties = computed(() => {
  if (props.schema.properties) {
    return props.schema.properties as Record<string, any>;
  } else {
    return undefined;
  }
});

const getType = (schema: any) => {
  let type;
  if (schema.const) {
    type = "const";
  } else if (schema.enum) {
    type = "enum";
  } else if (schema.type) {
    switch (schema.type) {
      case "string":
        type = "string";
        break;
      case "number":
        type = "number";
        break;
      case "integer":
        type = "number";
        break;
      case "object":
        type = "object";
        break;
      case "array":
        type = "array";
        break;
      case "boolean":
        type = "boolean";
        break;
    }
  }
  return type;
};

const emitValue = (value) => {
  valueRef.value = value;
  emit("input", value);
};

onMounted(() => {
  typeRef.value = getType(props.schema);
  if (typeRef.value === "const") {
    valueRef.value = props.schema.const;
    // this.$emit('input', props.schema.const);
  } else if (typeRef.value === "object") {
    valueRef.value = {};
  } else if (typeRef.value === "array") {
    valueRef.value = [];
  }
  if (props.schema.default) {
    valueRef.value = props.schema.default;
  }
  if (props.didId && typeRef.value === "string" && props.name === "id") {
    valueRef.value = props.didId;
  }
});
</script>

<template>
  <FormField
    :label="schema.title ?? name"
    class="pl-6"
    v-slot="props"
    :label-width="typeRef === 'object' ? 12 : 2"
  >
    <template v-if="typeRef === 'const'">
      <InputText v-model="valueRef" disabled class="w-full" />
    </template>
    <template v-else-if="typeRef === 'enum'">
      <Select
        :id="props.id"
        class="w-full"
        v-model="valueRef"
        :placeholder="name"
        :options="schema.enum"
      />
    </template>
    <template v-else-if="typeRef === 'string'">
      <InputText
        :id="props.id"
        class="w-full"
        v-model="valueRef"
        :placeholder="name"
        :required="required"
        :pattern="schema.pattern"
        :validation-message="
          schema.pattern
            ? `Field must conform to pattern: ${schema.pattern}`
            : undefined
        "
      />
    </template>
    <template v-else-if="typeRef === 'number'">
      <InputNumber
        :id="props.id"
        class="w-full"
        v-model="valueRef"
        :placeholder="name"
        :required="required"
      />
    </template>
    <template v-else-if="typeRef === 'boolean'">
      <ToggleButton :id="props.id" class="w-full" v-model="valueRef" />
    </template>
    <template v-else-if="typeRef === 'object'">
      <JsonSchemaFormElement
        v-for="(child, key) in parsedProperties"
        :schema="child"
        :key="key"
        :name="key"
        :required="schema.required?.includes(key)"
        @input="emitValue"
      ></JsonSchemaFormElement>
    </template>
    <template v-else-if="typeRef === 'array'">
      <template v-if="getType(schema.items) !== 'string'"
        >Only string arrays supported at this moment</template
      >
      <template v-else>
        <AutoComplete
          :id="props.id"
          class="w-full"
          v-model="valueRef"
          multiple
          typeahead
        ></AutoComplete>
      </template>
    </template>
  </FormField>
</template>
