<script setup lang="ts">
import {
  NegotiationDetailDto,
  NegotiationStatusDto
} from "@tsg-dsp/common-dtos";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";
import { stripDspace } from "@tsg-dsp/common-ui/utils/common";
import http from "@tsg-dsp/common-ui/utils/http";
import MonacoEditor from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

const props = defineProps<{
  negotiation: NegotiationStatusDto;
}>();
const display = ref(false);

const stringifiedOffer = ref("");
const ctaNegotiation = ref<NegotiationDetailDto>();

const toast = useToast();

const open = () => {
  display.value = true;
};
const close = () => {
  display.value = false;
};

const getNegotiation = async (negotiationId: string) => {
  try {
    const response = await http.get(`management/negotiations/${negotiationId}`);
    ctaNegotiation.value = response.data;
    stringifiedOffer.value = JSON.stringify(
      ctaNegotiation.value.offer,
      null,
      2
    );
    open();
    return response;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const agreeNegotiation = async (negotiation: NegotiationDetailDto) => {
  try {
    await http.post(`management/negotiations/${negotiation.localId}/agreement`);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Successfully sent contract agreement",
      life: 3000
    });
    close();
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
      wants to access dataset:
      <span class="block text-surface-600 dark:text-surface-200 font-small mb-4"
        >{{ negotiation.dataSet }}
      </span>
      <div class="flex justify-between mb-0">
        <Dialog
          header="Do you agree with the following offer?"
          v-model:visible="display"
          :style="{ width: '50vw' }"
          :breakpoints="{ '1199px': '80vw', '575px': '97vw' }"
          :modal="true">
          <div class="grid grid-cols-12 gap-4">
            <div class="col-span-12">
              <MonacoEditor
                :static="ctaNegotiation.offer"
                :read-only="true"
                :max-lines="35" />
            </div>
          </div>
          <template #footer>
            <Button
              label="Decline"
              severity="danger"
              icon="pi pi-times"
              type="submit"
              class="p-button-outlined"
              @click="declineNegotiation(ctaNegotiation)" />
            <Button
              label="Accept"
              severity="success"
              icon="pi pi-check"
              type="submit"
              class="p-button-outlined"
              @click="agreeNegotiation(ctaNegotiation)" />
          </template>
        </Dialog>
        <Button
          raised
          label="View Contract Negotiation"
          class="text-center p-4"
          style="width: 100%"
          @click="getNegotiation(negotiation.localId)" />
      </div>
    </template>
  </Card>
</template>
