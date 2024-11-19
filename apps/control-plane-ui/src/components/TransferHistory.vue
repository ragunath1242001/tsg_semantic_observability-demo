<script setup lang="ts">
import { stripDspace } from "@tsg-dsp/common-ui/utils/common";

import { TransferDetailDto, TransferStatus } from "@tsg-dsp/common-dsp";
import { ref, toRef } from "vue";
import { useToast } from "primevue/usetoast";
import http from "@tsg-dsp/common-ui/utils/http";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

const props = defineProps<{
  transfers: TransferStatus[];
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

const getTransfer = async (uuid: string) => {
  if (uuid) {
    try {
      const response = await http.get(`management/transfers/${uuid}`);
      accTransfer.value = response.data;
      if (accTransfer.value) {
        accTransfer.value.events = accTransfer.value.events.reverse();
      }
      return response;
    } catch (error) {
      toast.add(
        toastError({
          error,
          summary: "Failed to load negotiation",
          defaultMessage: `Could not load negotiation with id ${uuid}`
        })
      );
      console.error("Error:", error);
      throw error;
    }
  }
};
</script>
<template>
  <Card
    style="border-radius: 12px; border: 1px solid var(--surface-border)"
    class="mt-4">
    <template #title><h5>Transfer History</h5></template>
    <template #subtitle
      >Here you can find the history of the transfers.</template
    >
    <template #content v-if="transfers.length > 0">
      <Accordion @update:value="getTransfer">
        <AccordionPanel
          v-for="(transfer, index) in transfers"
          :value="transfer.localId">
          <AccordionHeader>
            <span class="flex items-center justify-between w-full">
              <div>
                <i :class="calculateIcon(index)"></i>
                <span class="mx-2"
                  >{{ transfer.localId }} -
                  {{ transfer.remoteParty.replace("%3A", ":") }}</span
                >
              </div>
              <div>
                <Tag
                  class="ml-auto mr-6"
                  :value="stripDspace(transfer.state)"
                  :severity="getSeverity(transfer.state)" />
                <small class="p-text-secondary">
                  {{ new Date(transfer.modifiedDate).toLocaleString() }}
                </small>
              </div>
            </span>
          </AccordionHeader>
          <AccordionContent>
            <div
              class="flex items-stretch grid grid-cols-12 gap-4 card-container"
              v-if="accTransfer">
              <div
                class="p-0 mt-6 col-span-12 xl:col-span-6 flex flex-wrap justify-center">
                <Timeline :value="accTransfer.events">
                  <template #opposite="slotProps">
                    <small class="p-text-secondary">{{
                      new Date(slotProps.item.time).toLocaleString()
                    }}</small>
                  </template>
                  <template #content="slotProps">
                    <Tag
                      :value="stripDspace(slotProps.item.state)"
                      :severity="getSeverity(slotProps.item.state)" />
                  </template>
                </Timeline>
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </template>
    <template #content v-else> There is no history to display</template>
  </Card>
</template>
