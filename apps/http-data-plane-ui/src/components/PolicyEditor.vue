<script setup lang="ts">
import { ODRLAction } from "@tsg-dsp/common-dsp";
import { PolicyConfig } from "@tsg-dsp/http-data-plane-dtos";
import { onMounted, ref, watch } from "vue";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { pushOrCreate } from "../utils/arrays.js";

const odrlOfferSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title:
    "Dataspace Protocol Message Offer (https://w3id.org/dspace/2024/1/negotiation/contract-schema.json#/definitions/MessageOffer)",
  type: "object",
  $ref: "https://w3id.org/dspace/2024/1/negotiation/contract-schema.json#/definitions/MessageOffer"
};
const odrlActions = Object.values(ODRLAction);
const rawTemplate = () => ({
  "@type": "odrl:Offer",
  "@id": `urn:uuid:${crypto.randomUUID()}`,
  "odrl:assigner": "did:web:...",
  "odrl:permission": [
    {
      "odrl:action": "odrl:use"
    }
  ]
});

const policy = defineModel<PolicyConfig>();

const rawPolicy = ref<string>();

watch(rawPolicy, (value) => {
  try {
    policy.value.raw = JSON.parse(value);
  } catch (error) {
    console.log(error);
  }
});

watch(
  () => policy.value.type,
  (type) => {
    if (type === "manual") {
      if (policy.value.raw) {
        rawPolicy.value = JSON.stringify(policy.value.raw, null, 2);
      } else {
        rawPolicy.value = JSON.stringify(rawTemplate(), null, 2);
      }
    }
  }
);

onMounted(() => {
  if (policy.value.type === "manual") {
    if (policy.value.raw) {
      rawPolicy.value = JSON.stringify(policy.value.raw, null, 2);
    } else {
      rawPolicy.value = JSON.stringify(rawTemplate(), null, 2);
    }
  }
});
</script>

<template>
  <FormField label="Type">
    <SelectButton
      v-model="policy.type"
      :options="['default', 'rules', 'manual']"
      :option-label="(value) => value[0].toUpperCase() + value.slice(1)" />
  </FormField>
  <FormField v-if="policy.type === 'manual'" label="Manual">
    <MonacoEditorVue
      v-model="rawPolicy"
      :schema="odrlOfferSchema"
      schema-warning
      :max-lines="25"
      :min-lines="15" />
    <small
      >The warnings are based on a opiniated JSON-Schema of ODRL from the
      Dataspace Protocol, which does not cover all possibilities present in the
      JSON-LD structure.<br />So warnings might be presented regardless of
      whether the input is actually correct. And vice-versa, even when no
      warnings are presented the request might be rejected.</small
    >
  </FormField>
  <FormField v-if="policy.type === 'rules'" label="Permissions">
    <small
      >Permissions allow the defined action, when all constraints are
      met.</small
    >
    <hr />
    <div v-for="(permission, idx) in policy.permissions" :key="idx">
      <div class="font-bold py-2">Action</div>
      <Select
        v-model="permission.action"
        editable
        :options="odrlActions"
        placeholder="Select or provide actions"
        class="w-full" />
      <div class="font-bold py-2">Constraints</div>
      <div class="grid grid-cols-12 gap-4 grid-nogutter ml-4">
        <template v-for="(constraint, i) in permission.constraints" :key="i">
          <div class="col-span-11 md:col-span-5">
            <Select
              v-model="constraint.type"
              class="w-full"
              :options="['CredentialType', 'Recipient', 'License']"
              placeholder="Constraint type" />
          </div>
          <div class="col-span-11 md:col-span-6">
            <InputText
              v-model="constraint.value"
              class="w-full"
              placeholder="Value" />
          </div>
          <div class="col-span-1">
            <Button
              size="small"
              icon="pi pi-times"
              severity="danger"
              outlined
              @click="permission.constraints.splice(i, 1)" />
          </div>
        </template>
        <div class="col-span-12">
          <Button
            class="mt-2"
            label="Add constraint"
            icon="pi pi-plus"
            severity="info"
            size="small"
            @click="
              pushOrCreate(permission, 'constraints', {
                type: '',
                value: ''
              })
            " />
        </div>
      </div>
      <Button
        class="my-2"
        label="Remove permission"
        icon="pi pi-minus"
        severity="danger"
        size="small"
        @click="policy.permissions.splice(idx, 1)" />
      <hr />
    </div>
    <div
      v-if="!policy.permissions || policy.permissions.length === 0"
      class="py-2">
      No permissions
    </div>
    <Button
      class="my-2"
      label="Add permission"
      icon="pi pi-plus"
      severity="success"
      size="small"
      @click="
        pushOrCreate(policy, 'permissions', {
          action: '',
          constraints: []
        })
      " />
  </FormField>
  <FormField v-if="policy.type === 'rules'" label="Prohibitions">
    <small
      >Prohibitions explicitly prohibit the defined action, when all constraints
      are met. If both permission(s) as prohibition(s) match for a given
      transfer, the prohibition(s) take precedence.</small
    >
    <hr />
    <div v-for="(prohibition, idx) in policy.prohibitions" :key="idx">
      <div class="font-bold py-2">Action</div>
      <Select
        v-model="prohibition.action"
        editable
        :options="odrlActions"
        placeholder="Select or provide actions"
        class="w-full" />
      <div class="font-bold py-2">Constraints</div>
      <div class="grid grid-cols-12 gap-4 grid-nogutter ml-4">
        <template v-for="(constraint, i) in prohibition.constraints" :key="i">
          <div class="col-span-11 md:col-span-5">
            <Select
              v-model="constraint.type"
              class="w-full"
              :options="['CredentialType', 'Recipient', 'License']"
              placeholder="Constraint type" />
          </div>
          <div class="col-span-11 md:col-span-6">
            <InputText
              v-model="constraint.value"
              class="w-full"
              placeholder="Value" />
          </div>
          <div class="col-span-1">
            <Button
              size="small"
              icon="pi pi-times"
              severity="danger"
              outlined
              @click="prohibition.constraints.splice(i, 1)" />
          </div>
        </template>
        <div class="col-span-12">
          <Button
            class="mt-2"
            label="Add constraint"
            icon="pi pi-plus"
            severity="info"
            size="small"
            @click="
              pushOrCreate(prohibition, 'constraints', {
                type: '',
                value: ''
              })
            " />
        </div>
      </div>
      <Button
        class="my-2"
        label="Remove prohibition"
        icon="pi pi-minus"
        severity="danger"
        size="small"
        @click="policy.prohibitions.splice(idx, 1)" />
      <hr />
    </div>
    <div
      v-if="!policy.prohibitions || policy.prohibitions.length === 0"
      class="py-2">
      No prohibitions
    </div>
    <Button
      class="my-2"
      label="Add prohibition"
      icon="pi pi-plus"
      size="small"
      severity="success"
      @click="
        pushOrCreate(policy, 'prohibitions', {
          action: '',
          constraints: []
        })
      " />
  </FormField>
</template>
