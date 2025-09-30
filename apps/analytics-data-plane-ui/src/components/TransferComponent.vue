<script setup lang="ts">
import { TransferDto } from "@tsg-dsp/common-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import http from "@tsg-dsp/common-ui/utils/http";
import { defineProps, onMounted, ref } from "vue";

import { stateSeverity } from "../utils/stateseverity";

const props = defineProps<{
  transferId: string;
}>();

const transfer = ref<TransferDto>();

const getTransfer = async (id: string) => {
  const response = await http.get(`/management/transfers/${id}`);
  transfer.value = response.data;
  console.log(`Getting transfer with id: ${id}`);
};

onMounted(async () => {
  await getTransfer(props.transferId);
});
</script>
<template>
  <div>
    <Card>
      <template #title>Transfer {{ transfer?.id }}</template>
      <template #subtitle>Transfer properties</template>
      <template #content>
        <div v-if="transfer" class="flex flex-col gap-4">
          <FormField label="Identifier">{{ transfer?.id }}</FormField>
          <FormField label="State">
            <Tag
              :severity="stateSeverity(transfer?.state)"
              :value="transfer?.state" />
          </FormField>
          <FormField label="Role">{{ transfer?.role }}</FormField>
          <FormField label="Process ID">{{ transfer?.processId }}</FormField>
          <FormField label="Remote party">{{
            transfer?.remoteParty
          }}</FormField>
          <FormField label="Dataset ID">
            {{ transfer?.datasetId }}
          </FormField>
          <FormField label="Created">{{
            new Date(transfer?.createdDate).toLocaleString()
          }}</FormField>
          <FormField label="Last Modified">{{
            new Date(transfer?.modifiedDate).toLocaleString()
          }}</FormField>
        </div>
      </template>
    </Card>
  </div>
</template>
