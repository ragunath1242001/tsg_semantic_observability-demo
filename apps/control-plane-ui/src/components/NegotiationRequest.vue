<script setup lang="ts">
import { Action, Resource } from "@tsg-dsp/common-dtos";
import {
  NegotiationDetailDto,
  NegotiationStatusDto
} from "@tsg-dsp/common-dtos";
import MonacoEditor from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useToast } from "primevue/usetoast";
import { computed, ref } from "vue";

defineProps<{
  negotiation: NegotiationStatusDto;
}>();
const display = ref(false);

const stringifiedOffer = ref("");
const ctaNegotiation = ref<NegotiationDetailDto>();

const toast = useToast();
const userStore = useUserStore();

const canUpdateNegotiation = computed(() =>
  userStore.canAccessRoute(Action.UPDATE, Resource.CP_NEGOTIATION)
);

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
  if (!canUpdateNegotiation.value) return;
  try {
    await http.post(`management/negotiations/${negotiation.id}/agreement`);
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
  if (!canUpdateNegotiation.value) return;
  try {
    await http.post(`management/negotiations/${negotiation.id}/termination`);
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
  <Card>
    <template #title
      ><div class="flex justify-between mb-4">
        <div>
          {{ negotiation.state }}
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
          v-model:visible="display"
          header="Do you agree with the following offer?"
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
            <template v-if="canUpdateNegotiation">
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
          </template>
        </Dialog>
        <Button
          raised
          label="View Contract Negotiation"
          class="text-center p-4"
          style="width: 100%"
          @click="getNegotiation(negotiation.id)" />
      </div>
    </template>
  </Card>
</template>
