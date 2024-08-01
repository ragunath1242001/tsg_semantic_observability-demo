<script setup lang="ts">
import { INegotiationStatusDto } from "@tsg-dsp/control-plane-dtos";
import { useToast } from "primevue/usetoast";
import utils from "../utils/common";
import http from "../utils/http";

const props = defineProps<{
  negotiation: INegotiationStatusDto;
  endState: "verify" | "finalize";
}>();

const toast = useToast();

const proceedNegotiation = async (negotiation: INegotiationStatusDto) => {
  try {
    await http.post(
      `management/negotiations/${negotiation.localId}/${props.endState}`
    );
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Successfully sent contract agreement",
      life: 3000,
    });
  } catch (e) {
    console.log(e);
    console.error(`Could not send negotiation agreement. Error: ${e}`);
    toast.add({
      severity: "error",
      summary: "Failed to send negotiation agreement",
      detail: `${e.response.data.message}`,
      life: 3000,
    });
  }
};

const declineNegotiation = async (negotiation) => {
  try {
    await http.post(`management/negotiations/${negotiation.localId}/terminate`);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Successfully declined contract offer",
      life: 3000,
    });
    close();
  } catch (e) {
    console.error(`Could not decline contract offer. Error: ${e}`);
    toast.add({
      severity: "error",
      summary: "Failed to decline contract offer",
      detail: `${e.response.data.message}`,
      life: 3000,
    });
  }
};
</script>
<template>
  <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #content>
      <div class="flex justify-content-between mb-3">
        <div>
          <h5>{{ utils.stripDspace(negotiation.state) }}</h5>
        </div>
        <div
          class="flex align-items-center justify-content-center bg-blue-100 border-round"
          style="width: 2.5rem; height: 2.5rem"
        >
          <i class="pi pi-file text-blue-500 text-xl"></i>
        </div>
      </div>
      <span style="word-wrap: break-word" class="block text-600 font-small mb-3"
        >{{ negotiation.remoteParty.replace("%3A", ":") }}
      </span>
      <span class="block text-600 font-small mb-3">
        <template v-if="endState === 'verify'">accepted/agreed to</template><template v-else>verified</template> your request. Do you want to {{ endState }}?
      </span>
      <div class="flex justify-content-between mb-0">
        <Button
          label="No"
          severity="danger"
          icon="pi pi-times"
          type="submit"
          class="p-button-outlined"
          @click="declineNegotiation(negotiation)"
        />
        <Button
          label="Sign"
          severity="success"
          icon="pi pi-check"
          type="submit"
          class="p-button-outlined"
          @click="proceedNegotiation(negotiation)"
        />
      </div>
    </template>
  </Card>
</template>
