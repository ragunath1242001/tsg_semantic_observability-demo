<script setup lang="ts">
import { NegotiationStatusDto } from "@tsg-dsp/common-dtos";
import { stripDspace } from "@tsg-dsp/common-ui/utils/common";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useToast } from "primevue/usetoast";

const props = defineProps<{
  negotiation: NegotiationStatusDto;
  endState: "verify" | "finalize";
}>();

const toast = useToast();

const proceedNegotiation = async (negotiation: NegotiationStatusDto) => {
  try {
    await http.post(
      `management/negotiations/${negotiation.localId}/${props.endState}`
    );
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Successfully sent contract agreement",
      life: 3000
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to send negotiation agreement",
        defaultMessage: "Could not send negotiation agreement"
      })
    );
    console.error(`Could not send negotiation agreement. Error: ${error}`);
  }
};

const declineNegotiation = async (negotiation) => {
  try {
    await http.post(`management/negotiations/${negotiation.localId}/terminate`);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Successfully declined contract offer",
      life: 3000
    });
    close();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to decline contract offer",
        defaultMessage: "Could not decline contract offer"
      })
    );
    console.error(`Could not decline contract offer. Error: ${error}`);
  }
};
</script>
<template>
  <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title
      ><div class="flex justify-between mb-4">
        <div>
          {{ stripDspace(negotiation.state) }}
        </div>
        <div
          class="flex items-center justify-center bg-blue-100 rounded-border"
          style="width: 2.5rem; height: 2.5rem">
          <i class="pi pi-file text-blue-500 text-xl"></i>
        </div></div
    ></template>
    <template #subtitle>{{
      new Date(negotiation.modifiedDate).toLocaleString()
    }}</template>
    <template #content>
      <span
        class="block text-surface-600 dark:text-surface-200 font-small mb-4 break-words"
        >{{ negotiation.remoteParty.replace("%3A", ":") }}
      </span>
      <span
        class="block text-surface-600 dark:text-surface-200 font-small mb-4">
        <template v-if="endState === 'verify'">accepted/agreed to</template
        ><template v-else>verified</template> your request. Do you want to
        {{ endState }}?
      </span>
      <div class="flex justify-between mb-0">
        <Button
          label="No"
          severity="danger"
          icon="pi pi-times"
          type="submit"
          class="p-button-outlined"
          @click="declineNegotiation(negotiation)" />
        <Button
          label="Sign"
          severity="success"
          icon="pi pi-check"
          type="submit"
          class="p-button-outlined"
          @click="proceedNegotiation(negotiation)" />
      </div>
    </template>
  </Card>
</template>
