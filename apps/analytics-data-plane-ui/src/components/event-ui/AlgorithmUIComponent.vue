<script setup lang="ts">
import {
  InternalEventDto,
  UIElementType,
  UITemplate
} from "@tsg-dsp/analytics-data-plane-dtos";
import { defineProps } from "vue";

import FieldUI from "./FieldUI.vue";
import LineGraphUI from "./LineGraphUI.vue";
import TableUI from "./TableUI.vue";

const {
  uiTemplate,
  eventName,
  minHeight = "22rem",
  data
} = defineProps<{
  uiTemplate: UITemplate;
  eventName: string;
  minHeight?: string;
  data: Array<InternalEventDto>;
}>();
</script>

<template>
  <LineGraphUI
    v-if="uiTemplate.type === UIElementType.LINE_GRAPH"
    :ui-template="uiTemplate"
    :event-name="eventName"
    :min-height="minHeight"
    :data="data" />
  <FieldUI
    v-else-if="uiTemplate.type === UIElementType.FIELD"
    :ui-template="uiTemplate"
    :data="data" />
  <TableUI
    v-else-if="uiTemplate.type === UIElementType.TABLE"
    :ui-template="uiTemplate"
    :event-name="eventName"
    :data="data" />
</template>
