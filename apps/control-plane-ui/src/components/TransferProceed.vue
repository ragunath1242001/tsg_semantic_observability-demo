<script setup lang="ts">
import { TransferStatus } from "@tsg-dsp/control-plane-dtos";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";
import utils from "../utils/common";
import http from "../utils/http";
import { useConfirm } from "primevue/useconfirm";

const props = defineProps<{
  transfer: TransferStatus;
}>();

const display = ref<boolean>(false);
const nextState = ref("");
const code = ref("");
const reason = ref("");

const confirm = useConfirm();

const toast = useToast();

const determineNextHappyState = (transfer: TransferStatus) => {
  switch (transfer.state) {
    case "dspace:REQUESTED":
      return "start";
    case "dspace:SUSPENDED":
      return "start";
    case "dspace:STARTED":
      return "complete";
  }
};

const determineHeader = () => {
  return `What is the reason for your decision to ${nextState.value}?`;
};

const determineWord = (transfer: TransferStatus) => {
  switch (transfer.state) {
    case "dspace:REQUESTED":
      return "requested";
    case "dspace:STARTED":
      return "started";
    case "dspace:SUSPENDED":
      return "suspended";
  }
};
const determineTooltip = (transfer: TransferStatus) => {
  switch (transfer.state) {
    case "dspace:REQUESTED":
      return "Start";
    case "dspace:SUSPENDED":
      return "Restart";
    case "dspace:STARTED":
      return "Complete";
  }
};

const sendTransfer = async (transfer: TransferStatus, nextState: string) => {
  try {
    close();
    await http.post(`management/transfers/${transfer.localId}/${nextState}`);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: `Successfully proceeded to ${nextState}`,
      life: 3000,
    });
  } catch (e) {
    console.log(e);
    console.error(`Could not send transfer. Error: ${e}`);
    toast.add({
      severity: "error",
      summary: "Failed to send transfer",
      detail: `${e.response.data.message}`,
      life: 3000,
    });
  }
};

const proceedTransfer = async (transfer: TransferStatus) => {
  const nextState = determineNextHappyState(transfer);
  if (nextState == "complete") {
    confirm.require({
      header: `Are you sure you want to complete this transfer?`,
      message: "This will stop the data transfer!",
      icon: "pi pi-info-circle",
      rejectLabel: "Cancel",
      acceptLabel: "Complete",
      rejectClass: "p-button-secondary p-button-outlined",
      acceptClass: "p-button-success",
      accept: async () => {
        await sendTransfer(transfer, nextState);
      },
    });
  } else {
    await sendTransfer(transfer, nextState);
  }
};

const openDialog = (next: string) => {
  nextState.value = next;
  display.value = true;
};

const close = () => {
  display.value = false;
};

const terminateTransfer = async (transfer) => {
  try {
    const word = nextState.value;
    if (word !== "suspend" && word !== "terminate") {
      console.error(`Word is not set correctly. value: ${word}`);
      toast.add({
        severity: "error",
        summary: "Failed to terminate transfer",
        detail: `Word is not set correctly. value: ${word}`,
        life: 3000,
      });
      return;
    }
    const body = {
      code: code.value,
      reason: reason.value,
    };
    await http.post(`management/transfers/${transfer.localId}/${word}`, body);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Successfully terminated transfer",
      life: 3000,
    });
    close();
  } catch (e) {
    console.error(`Could not terminate transfer. Error: ${e}`);
    toast.add({
      severity: "error",
      summary: "Failed to terminate transfer",
      detail: `${e.response.data.message}`,
      life: 3000,
    });
  }
};
</script>
<template>
  <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #content>
      <div class="flex justify-between mb-4">
        <div>
          <h5>{{ utils.stripDspace(transfer.state) }}</h5>
        </div>
        <div
          class="flex items-center justify-center bg-blue-100 rounded-border"
          style="width: 2.5rem; height: 2.5rem"
        >
          <i class="pi pi-file text-blue-500 text-xl"></i>
        </div>
      </div>
      <span
        class="block text-surface-600 dark:text-surface-200 font-small mb-4"
      >
        Transfer with
      </span>
      <span
        style="word-wrap: break-word"
        class="block text-surface-600 dark:text-surface-200 font-small mb-4"
        >{{ transfer.remoteParty.replace("%3A", ":") }}
      </span>
      <span
        class="block text-surface-600 dark:text-surface-200 font-small mb-4"
      >
        {{ determineWord(transfer) }}, what do you want to do?
      </span>
      <div class="flex justify-between mb-0">
        <Button
          v-tooltip.top="'Terminate'"
          severity="danger"
          icon="pi pi-times"
          type="submit"
          class="p-button-outlined"
          @click="openDialog('terminate')"
        />
        <Button
          v-tooltip.top="'Suspend'"
          severity="warn"
          icon="pi pi-pause"
          type="submit"
          v-if="transfer.state === 'dspace:STARTED'"
          class="p-button-outlined"
          @click="openDialog('suspend')"
        />
        <Button
          v-tooltip.top="determineTooltip(transfer)"
          severity="success"
          icon="pi pi-check"
          type="submit"
          class="p-button-outlined"
          @click="proceedTransfer(transfer)"
        />
        <Dialog
          :header="determineHeader()"
          v-model:visible="display"
          :breakpoints="{ '840px': '75vw' }"
          :modal="true"
        >
          <Card
            style="border-radius: 12px; border: 1px solid var(--surface-border)"
          >
            <template #content>
              <div class="field grid grid-cols-12 gap-4">
                <label for="code" class="col-span-12 mb-2 md:col-span-2 md:mb-0"
                  >Code</label
                >
                <div class="col-span-12 md:col-span-10">
                  <InputText id="code" type="text" v-model="code" />
                </div>
              </div>
              <div class="field grid grid-cols-12 gap-4">
                <label
                  for="reason"
                  class="col-span-12 mb-2 md:col-span-2 md:mb-0"
                  >Reason</label
                >
                <div class="col-span-12 md:col-span-10">
                  <InputText id="reason" type="text" v-model="reason" />
                </div>
              </div>
            </template>
          </Card>
          <template #footer>
            <Button
              label="Cancel"
              severity="secondary"
              icon="pi pi-times"
              type="submit"
              class="p-button-outlined"
              @click="close()"
            />
            <Button
              label="Proceed"
              severity="success"
              icon="pi pi-check"
              type="submit"
              class="p-button-outlined"
              @click="terminateTransfer(transfer)"
            />
          </template>
        </Dialog>
      </div>
    </template>
  </Card>
</template>
