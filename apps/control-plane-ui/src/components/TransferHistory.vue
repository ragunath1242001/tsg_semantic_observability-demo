<script setup lang="ts">
import { TransferDetailDto, TransferStatus } from "@tsg-dsp/common-dsp";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useToast } from "primevue/usetoast";
import { ref, toRef } from "vue";

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
    case "STARTED":
      return "primary";
    case "COMPLETED":
      return "success";
    case "REQUESTED":
      return "secondary";
    case "TERMINATED":
      return "danger";
    case "SUSPENDED":
      return "warn";
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
  <Card class="mt-4">
    <template #title><h5>Transfer History</h5></template>
    <template #subtitle
      >Here you can find the history of the transfers.</template
    >
    <template v-if="transfers.length > 0" #content>
      <Accordion @update:value="getTransfer">
        <AccordionPanel
          v-for="(transfer, index) in transfers"
          :key="transfer.localId"
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
                  :value="transfer.state"
                  :severity="getSeverity(transfer.state)" />
                <small class="p-text-secondary">
                  {{ new Date(transfer.modifiedDate).toLocaleString() }}
                </small>
              </div>
            </span>
          </AccordionHeader>
          <AccordionContent>
            <div
              v-if="accTransfer"
              class="flex items-stretch grid grid-cols-12 gap-4 card-container">
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
                      :value="slotProps.item.state"
                      :severity="getSeverity(slotProps.item.state)" />
                  </template>
                </Timeline>
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </template>
    <template v-else #content> There is no history to display</template>
  </Card>
</template>
