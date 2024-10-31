<script setup lang="ts">
import { ref } from "vue";

const props = defineProps({
  label: String,
  noLabel: Boolean,
  labelWidth: {
    type: Number,
    default: 2
  }
});

const labelClass = ref("");
const valueClass = ref("");
const formId = ref(`field-${Math.floor(Math.random() * 100000 + 10000)}`);

if (props.noLabel) {
  valueClass.value = `col-span-12 md:col-span-${
    12 - props.labelWidth
  } md:col-start-${props.labelWidth + 1}`;
} else {
  labelClass.value = `flex items-center col-span-12 mb-2 md:col-span-${props.labelWidth} md:mb-0 font-bold`;
  valueClass.value = `col-span-12 md:col-span-${12 - props.labelWidth}`;
}
</script>

<template>
  <div class="grid grid-cols-12 gap-2">
    <label v-if="!props.noLabel" :for="formId" :class="labelClass">{{
      props.label
    }}</label>
    <div :class="valueClass">
      <slot :id="formId"></slot>
    </div>
  </div>
</template>
