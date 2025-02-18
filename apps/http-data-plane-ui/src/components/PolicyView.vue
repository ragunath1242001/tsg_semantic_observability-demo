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
  <FormField v-if="props.policy?.type === 'manual'" class="mb-1" label="Raw">
    <MonacoEditorVue
      :static="props.policy?.raw"
      :read-only="true"
      :max-lines="15" />
  </FormField>
  <div v-if="props.policy?.type === 'rules'" class="pl-4">
    <h5>Permissions</h5>
    <div
      v-for="(permission, idx) in props.policy?.permissions || []"
      :key="permission.action"
      class="pl-4">
      <hr v-if="idx !== 0" />
      <FormField class="mb-1" label="Action">{{ permission.action }}</FormField>
      <FormField
        v-for="constraint in permission.constraints"
        :key="constraint.type"
        class="mb-1"
        label="Constraint"
        ><em>{{ constraint.type }}</em
        >: {{ constraint.value }}</FormField
      >
    </div>
    <div v-if="(props.policy?.permissions || []).length === 0">
      No permissions
    </div>
    <h5>Prohibitions</h5>
    <div
      v-for="(prohibition, idx) in props.policy?.prohibitions || []"
      :key="idx"
      class="pl-4">
      <hr v-if="idx !== 0" />
      <FormField class="mb-1" label="Action">{{
        prohibition.action
      }}</FormField>
      <FormField
        v-for="constraint in prohibition.constraints"
        :key="constraint.type"
        class="mb-1"
        label="Constraint"
        ><em>{{ constraint.type }}</em
        >: {{ constraint.value }}</FormField
      >
    </div>
    <div v-if="(props.policy?.prohibitions ?? []).length === 0">
      No prohibitions
    </div>
  </div>
</template>
