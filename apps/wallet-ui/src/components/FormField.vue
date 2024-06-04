<script setup lang="ts">
import { ref } from "vue";

const props = defineProps({
  label: String,
  noLabel: Boolean,
  labelWidth: {
    type: Number,
    default: 2,
  },
});

const labelClass = ref("");
const valueClass = ref("");
const formId = ref(`field-${Math.floor(Math.random() * 100000 + 10000)}`);

if (props.noLabel) {
  valueClass.value = `col-12 md:col-${12 - props.labelWidth} md:col-offset-${
    props.labelWidth
  }`;
} else {
  labelClass.value = `col-12 md:col-${props.labelWidth} md:mb-0 font-bold`;
  valueClass.value = `col-12 md:col-${12 - props.labelWidth}`;
}
</script>

<template>
  <div class="field grid">
    <label v-if="!props.noLabel" :for="formId" :class="labelClass">{{
      props.label
    }}</label>
    <div :class="valueClass">
      <slot :id="formId"></slot>
    </div>
  </div>
</template>
