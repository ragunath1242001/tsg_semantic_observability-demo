<script setup lang="ts">
import { PolicyConfig } from "@tsg-dsp/http-data-plane-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";

const props = defineProps<{ policy: PolicyConfig }>();
</script>

<template>
  <FormField class="mb-1" label="Type"
    ><span class="capitalize">{{
      props.policy?.type || "default"
    }}</span></FormField
  >
  <FormField class="mb-1" label="Raw" v-if="props.policy?.type === 'manual'">
    <MonacoEditorVue
      :static="props.policy?.raw"
      :read-only="true"
      :max-lines="15" />
  </FormField>
  <div class="pl-4" v-if="props.policy?.type === 'rules'">
    <h5>Permissions</h5>
    <div
      class="pl-4"
      v-for="(permission, idx) in props.policy?.permissions || []">
      <hr v-if="idx !== 0" />
      <FormField class="mb-1" label="Action">{{ permission.action }}</FormField>
      <FormField
        class="mb-1"
        label="Constraint"
        v-for="constraint in permission.constraints"
        ><em>{{ constraint.type }}</em
        >: {{ constraint.value }}</FormField
      >
    </div>
    <div v-if="(props.policy?.permissions || []).length === 0">
      No permissions
    </div>
    <h5>Prohibitions</h5>
    <div
      class="pl-4"
      v-for="(prohibition, idx) in props.policy?.prohibitions || []">
      <hr v-if="idx !== 0" />
      <FormField class="mb-1" label="Action">{{
        prohibition.action
      }}</FormField>
      <FormField
        class="mb-1"
        label="Constraint"
        v-for="constraint in prohibition.constraints"
        ><em>{{ constraint.type }}</em
        >: {{ constraint.value }}</FormField
      >
    </div>
    <div v-if="(props.policy?.prohibitions ?? []).length === 0">
      No prohibitions
    </div>
  </div>
</template>
