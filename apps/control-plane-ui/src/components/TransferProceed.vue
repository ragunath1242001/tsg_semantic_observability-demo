<script setup lang="ts">
import { TransferDetailDto } from "@tsg-dsp/common-dsp";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";

defineProps<{
  transfer: TransferDetailDto;
}>();

const display = ref<boolean>(false);
const nextState = ref("");
const code = ref("");
const reason = ref("");

const confirm = useConfirm();

const toast = useToast();

const determineNextHappyState = (transfer: TransferDetailDto) => {
  switch (transfer.state) {
    case "REQUESTED":
      return "start";
    case "SUSPENDED":
      return "start";
    case "STARTED":
      return "complete";
  }
};

const determineHeader = () => {
  return `What is the reason for your decision to ${nextState.value}?`;
};

const determineWord = (transfer: TransferDetailDto) => {
  switch (transfer.state) {
    case "REQUESTED":
      return "requested";
    case "STARTED":
      return "started";
    case "SUSPENDED":
      return "suspended";
  }
};
const determineTooltip = (transfer: TransferDetailDto) => {
  switch (transfer.state) {
    case "REQUESTED":
      return "Start";
    case "SUSPENDED":
      return "Restart";
    case "STARTED":
      return "Complete";
  }
};

const sendTransfer = async (transfer: TransferDetailDto, nextState: string) => {
  try {
    close();
    await http.post(`management/transfers/${transfer.localId}/${nextState}`);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: `Successfully proceeded to ${nextState}`,
      life: 3000
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to send transfer",
        defaultMessage: `Could not send transfer`
      })
    );
    console.log(error);
    console.error(`Could not send transfer. Error: ${error}`);
  }
};

const proceedTransfer = async (transfer: TransferDetailDto) => {
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
      }
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
      toast.add(
        toastError({
          error: null,
          summary: "Failed to terminate transfer",
          defaultMessage: `Word is not set correctly. value: ${word}`
        })
      );
      return;
    }
    const body = {
      code: code.value,
      reason: reason.value
    };
    await http.post(`management/transfers/${transfer.localId}/${word}`, body);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Successfully terminated transfer",
      life: 3000
    });
    close();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to terminate transfer",
        defaultMessage: `Could not terminate transfer`
      })
    );
    console.error(`Could not terminate transfer. Error: ${error}`);
  }
};
</script>
<template>
  <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>
      <div class="flex justify-between mb-4">
        <div>
          {{ transfer.state }}
        </div>
        <div
          class="flex items-center justify-center bg-blue-100 rounded-border"
          style="width: 2.5rem; height: 2.5rem">
          <i class="pi pi-file text-blue-500 text-xl"></i>
        </div>
      </div>
    </template>
    <template #subtitle>{{ transfer.localId }}</template>
    <template #content>
      <span
        class="block text-surface-600 dark:text-surface-200 font-small mb-4">
        Transfer with
      </span>
      <span
        class="block text-surface-600 dark:text-surface-200 font-small mb-4 break-words"
        >{{ transfer.remoteParty.replace("%3A", ":") }}
      </span>
      <span
        class="block text-surface-600 dark:text-surface-200 font-small mb-4">
        {{ determineWord(transfer) }}, what do you want to do?
      </span>
      <div class="flex justify-between mb-0">
        <Button
          v-tooltip.top="'Terminate'"
          severity="danger"
          icon="pi pi-times"
          type="submit"
          class="p-button-outlined"
          @click="openDialog('terminate')" />
        <Button
          v-if="transfer.state === 'STARTED'"
          v-tooltip.top="'Suspend'"
          severity="warn"
          icon="pi pi-pause"
          type="submit"
          class="p-button-outlined"
          @click="openDialog('suspend')" />
        <Button
          v-tooltip.top="determineTooltip(transfer)"
          severity="success"
          icon="pi pi-check"
          type="submit"
          class="p-button-outlined"
          @click="proceedTransfer(transfer)" />
        <Dialog
          v-model:visible="display"
          :header="determineHeader()"
          :breakpoints="{ '840px': '75vw' }"
          :modal="true">
          <Card
            style="
              border-radius: 12px;
              border: 1px solid var(--surface-border);
            ">
            <template #content>
              <div class="field grid grid-cols-12 gap-4">
                <label for="code" class="col-span-12 mb-2 md:col-span-2 md:mb-0"
                  >Code</label
                >
                <div class="col-span-12 md:col-span-10">
                  <InputText id="code" v-model="code" type="text" />
                </div>
              </div>
              <div class="field grid grid-cols-12 gap-4">
                <label
                  for="reason"
                  class="col-span-12 mb-2 md:col-span-2 md:mb-0"
                  >Reason</label
                >
                <div class="col-span-12 md:col-span-10">
                  <InputText id="reason" v-model="reason" type="text" />
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
              @click="close()" />
            <Button
              label="Proceed"
              severity="success"
              icon="pi pi-check"
              type="submit"
              class="p-button-outlined"
              @click="terminateTransfer(transfer)" />
          </template>
        </Dialog>
      </div>
    </template>
  </Card>
</template>
