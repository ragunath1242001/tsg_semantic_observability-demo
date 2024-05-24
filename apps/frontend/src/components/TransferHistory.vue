<script setup lang="ts">
import utils from "../utils/common";

import { TransferDetailDto, TransferStatusDto } from "@libs/dtos";
import { ref, toRef } from "vue";
import { AccordionTabOpenEvent } from "primevue/accordion";
import { useToast } from "primevue/usetoast";
import http from "../utils/http";

const props = defineProps<{
  transfers: TransferStatusDto[];
}>();

const transfers = toRef(props, "transfers");
const accTransfer = ref<TransferDetailDto>();

const toast = useToast();

const calculateColor = (index: number) => {
  const colors = ["blue", "orange", "cyan", "purple"];
  return colors[index % 4];
};

const calculateIcon = (index: number) => {
  return `pi pi-file text-${calculateColor(index)}-500 text-xl`;
};

const getSeverity = (state: string) => {
  switch (state) {
    case "dspace:STARTED":
      return "primary";
    case "dspace:COMPLETED":
      return "success";
    case "dspace:REQUESTED":
      return "secondary";
    case "dspace:TERMINATED":
      return "danger";
    case "dspace:SUSPENDED":
      return "warning";
  }
};

const getTransfer = async (event?: AccordionTabOpenEvent) => {
  try {
    const response = await http.get(
      `management/transfers/${transfers.value[event!.index].localId}`
    );
    accTransfer.value = response.data;
    if (accTransfer.value) {
      accTransfer.value.events = accTransfer.value.events.reverse();
    }
    return response;
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Failed to load negotiation",
      detail: `${e.response ? e.response.data.message : e}`,
      life: 3000,
    });
    console.error("Error:", e);
    throw e;
  }
};
</script>
<template>
  <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title><h5>Transfer History</h5></template>
    <template #subtitle
      >Here you can find the history of the transfers.</template
    >
    <template #content v-if="transfers.length > 0">
      <Accordion @tab-open="getTransfer">
        <AccordionTab
          v-for="(transfer, index) in transfers"
          :key="transfer.localId"
        >
          <template #header>
            <span
              class="flex align-items-center justify-content-between w-full"
            >
              <div>
                <i :class="calculateIcon(index)"></i>
                <span class="mx-2"
                  >{{ transfer.localId }} -
                  {{ transfer.remoteParty.replace("%3A", ":") }}</span
                >
              </div>
              <div>
                <Tag
                  class="ml-auto mr-4"
                  :value="utils.stripDspace(transfer.state)"
                  :severity="getSeverity(transfer.state)"
                />
                <small class="p-text-secondary">
                  {{ new Date(transfer.modifiedDate).toLocaleDateString() }}
                </small>
              </div>
            </span>
          </template>
          <div
            class="flex align-items-stretch grid card-container"
            v-if="accTransfer"
          >
            <div
              class="p-0 mt-4 col-12 xl:col-6 flex flex-wrap justify-content-center"
            >
              <Timeline :value="accTransfer.events">
                <template #opposite="slotProps">
                  <small class="p-text-secondary">{{
                    new Date(slotProps.item.time).toLocaleString()
                  }}</small>
                </template>
                <template #content="slotProps">
                  <Tag
                    :value="utils.stripDspace(slotProps.item.state)"
                    :severity="getSeverity(slotProps.item.state)"
                  />
                </template>
              </Timeline>
            </div>
          </div>
        </AccordionTab>
      </Accordion>
    </template>
    <template #content v-else> There is no history to display</template>
  </Card>
</template>
