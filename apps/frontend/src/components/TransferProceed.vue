<script setup lang="ts">
import { TransferStatusDto } from "@libs/dtos";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";
import utils from "../utils/common";
import http from "../utils/http";

const props = defineProps<{
  transfer: TransferStatusDto;
}>();

const display = ref<boolean>(false);
const nextState = ref("");
const code = ref("");
const reason = ref("");

const toast = useToast();

const determineNextHappyState = (transfer: TransferStatusDto) => {
  switch (transfer.state) {
    case "dspace:REQUESTED":
      return "start";
    case "dspace:SUSPENDED":
      return "start";
    case "dspace:STARTED":
      return "complete";
  }
};

const determineTerminateLabel = (transfer: TransferStatusDto) => {
  if (transfer.state === "dspace:STARTED") {
    return "";
  } else {
    return "Terminate";
  }
};

const determineHeader = () => {
  return `What is the reason for your decision to ${nextState.value}?`;
};

const determineWord = (transfer: TransferStatusDto) => {
  switch (transfer.state) {
    case "dspace:REQUESTED":
      return "requested";
    case "dspace:STARTED":
      return "started";
    case "dspace:SUSPENDED":
      return "suspended";
  }
};
const determineButton = (transfer: TransferStatusDto) => {
  switch (transfer.state) {
    case "dspace:REQUESTED":
      return "Start";
    case "dspace:SUSPENDED":
      return "Restart";
  }
};

const proceedTransfer = async (transfer: TransferStatusDto) => {
  try {
    close();
    const nextState = determineNextHappyState(transfer);
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
    console.error(`Could not decline contract offer. Error: ${e}`);
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
  <div class="card mb-0">
    <div class="flex justify-content-between mb-3">
      <div>
        <h5>{{ utils.stripDspace(transfer.state) }}</h5>
      </div>
      <div
        class="flex align-items-center justify-content-center bg-blue-100 border-round"
        style="width: 2.5rem; height: 2.5rem"
      >
        <i class="pi pi-file text-blue-500 text-xl"></i>
      </div>
    </div>
    <span class="block text-600 font-small mb-3"> Transfer with </span>
    <span class="block text-600 font-small mb-3"
      >{{ transfer.remoteParty }}
    </span>
    <span class="block text-600 font-small mb-3">
      {{ determineWord(transfer) }}, what do you want to do?
    </span>
    <div class="flex justify-content-between mb-0">
      <Button
        :label="determineTerminateLabel(transfer)"
        severity="danger"
        icon="pi pi-times"
        type="submit"
        class="p-button-outlined"
        @click="openDialog('terminate')"
      />
      <Button
        severity="warning"
        icon="pi pi-pause"
        type="submit"
        v-if="transfer.state === 'dspace:STARTED'"
        class="p-button-outlined"
        @click="openDialog('suspend')"
      />
      <Button
        :label="determineButton(transfer)"
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
        <div class="card p-fluid">
          <div class="field grid">
            <label for="code" class="col-12 mb-2 md:col-2 md:mb-0">Code</label>
            <div class="col-12 md:col-10">
              <InputText id="code" type="text" v-model="code" />
            </div>
          </div>
          <div class="field grid">
            <label for="reason" class="col-12 mb-2 md:col-2 md:mb-0"
              >Reason</label
            >
            <div class="col-12 md:col-10">
              <InputText id="reason" type="text" v-model="reason" />
            </div>
          </div>
        </div>
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
  </div>
</template>
