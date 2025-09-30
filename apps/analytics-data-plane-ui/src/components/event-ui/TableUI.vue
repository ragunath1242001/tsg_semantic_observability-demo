<script setup lang="ts">
import { UITemplate } from "@tsg-dsp/analytics-data-plane-dtos";
import { defineProps } from "vue";

const { uiTemplate } = defineProps<{
  uiTemplate: UITemplate;
}>();
</script>

<template>
  <Card>
    <template #title>{{ uiTemplate.description }}</template>
    <template #content>
      <span>Table UI Component - to be implemented</span>
    </template>
  </Card>
</template>
