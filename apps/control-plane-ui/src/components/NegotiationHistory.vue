<script setup lang="ts">
import { HashedMessage } from "@tsg-dsp/common-dsp";
import {
  NegotiationDetailDto,
  NegotiationStatusDto
} from "@tsg-dsp/common-dtos";
import MonacoEditor from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { ConfirmDialog, useConfirm } from "primevue";
import { useToast } from "primevue/usetoast";
import { ref, toRef } from "vue";

import { useDataPlaneStore } from "../stores/dataplane";

const props = defineProps<{
  negotiations: NegotiationStatusDto[];
}>();

const negotiations = toRef(props, "negotiations");
const accNegotiation = ref<NegotiationDetailDto>();
const localProof = ref<HashedMessage>();
const remoteProof = ref<HashedMessage>();

const dataPlaneStore = useDataPlaneStore();
const userStore = useUserStore();

const toast = useToast();
const confirm = useConfirm();

const dataPlaneSelection = ref<string>("auto");
const dataPlaneSelectionOptions = ref<{ label: string; value: string }[]>([]);

const calculateColor = (index: number) => {
  const colors = ["blue", "orange", "cyan", "purple"];
  return colors[index % 4];
};

const calculateIcon = (index: number) => {
  return `pi pi-file text-${calculateColor(index)}-500 text-xl`;
};

const getSeverity = (state: string) => {
  switch (state) {
    case "ACCEPTED":
      return "info";
    case "AGREED":
      return "primary";
    case "FINALIZED":
      return "success";
    case "OFFERED":
      return "contrast";
    case "REQUESTED":
      return "secondary";
    case "TERMINATED":
      return "danger";
    case "VERIFIED":
      return "warn";
  }
};

const getNegotiation = async (uuid: string) => {
  if (uuid) {
    try {
      const response = await http.get(`management/negotiations/${uuid}`);
      accNegotiation.value = response.data;
      accNegotiation.value.events = accNegotiation.value.events.reverse();
      localProof.value = accNegotiation.value.events.find(
        (e) => e.type === "local" && e.hashedMessage
      )?.hashedMessage;
      remoteProof.value = accNegotiation.value.events.find(
        (e) => e.type === "remote" && e.hashedMessage
      )?.hashedMessage;
      return response;
    } catch (error) {
      toast.add(
        toastError({
          error,
          summary: "Failed to load negotiation",
          defaultMessage: `Could not load negotiation with identifer ${uuid}`
        })
      );
      console.error("Error:", error);
      throw error;
    }
  }
};

const selectDataPlane = async (): Promise<string | undefined> => {
  dataPlaneSelectionOptions.value = [
    { label: "Auto", value: "auto" },
    ...(await dataPlaneStore.getDataPlanes()).map((dp) => {
      return {
        label: `${dp.managementAddress} (${dp.dataplaneType})`,
        value: dp.identifier
      };
    })
  ];
  return await new Promise((resolve, reject) => {
    confirm.require({
      group: "selectDataplane",
      header: "Select Data Plane",
      message: "Select the data plane to use for the transfer",
      icon: "pi pi-info-circle",
      acceptLabel: "Select",
      rejectLabel: "Cancel",
      acceptClass: "p-button-success",
      rejectClass: "p-button-secondary",
      accept: () => {
        let value = dataPlaneSelection.value;
        if (value === "auto") {
          value = undefined;
        }
        resolve(value);
        dataPlaneSelection.value = "auto";
      },
      reject: () => {
        reject();
      }
    });
  });
};

const requestTransfer = async (accNegotiation: NegotiationDetailDto) => {
  try {
    const address = accNegotiation.remoteAddress.split("negotiations")[0];
    const audience = accNegotiation.agreement.assigner;
    const agreementId = accNegotiation.agreement["@id"];
    let dataPlaneIdentifier = dataPlaneStore.hasDuplicateTypes
      ? await selectDataPlane()
      : undefined;
    const response = await http.post(`management/transfers/request`, null, {
      params: {
        address: address,
        agreementId: agreementId,
        audience: audience,
        dataPlaneIdentifier: dataPlaneIdentifier
      }
    });
    if (response.status == 200) {
      toast.add({
        severity: "success",
        summary: "Request sent",
        detail: "Successfully requested to start transfer process.",
        life: 3000
      });
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to request transfer",
        defaultMessage: "Could not load transfer"
      })
    );
    console.error("Error:", error);
    throw error;
  }
};
</script>
<template>
  <Card class="mt-4">
    <template #title><h5>Negotiation History</h5></template>
    <template #subtitle
      >Here you can find the history of the contract negotiations. Contracts
      that are finalized also allow the option to start a Transfer
      Process.</template
    >
    <template v-if="negotiations.length > 0" #content>
      <Accordion @update:value="getNegotiation">
        <AccordionPanel
          v-for="(negotiation, index) in negotiations"
          :key="index"
          :value="negotiation.localId">
          <AccordionHeader>
            <span class="flex items-center justify-between w-full">
              <div>
                <i :class="calculateIcon(index)"></i>
                <span class="mx-2"
                  >{{ negotiation.remoteParty.replace("%3A", ":") }} -
                  {{ negotiation.dataSet }}</span
                >
              </div>
              <div>
                <Tag
                  class="ml-auto mr-6"
                  :value="negotiation.state"
                  :severity="getSeverity(negotiation.state)" />
                <small class="p-text-secondary">
                  {{ new Date(negotiation.modifiedDate).toLocaleString() }}
                </small>
              </div>
            </span>
          </AccordionHeader>
          <AccordionContent>
            <div
              v-if="accNegotiation"
              class="flex items-stretch grid grid-cols-12 gap-4 card-container">
              <div class="p-0 col-span-12 xl:col-span-6">
                <Tabs value="Agreement">
                  <TabList>
                    <Tab value="Agreement">Agreement</Tab>
                    <Tab value="Local Signature">Local Signature</Tab>
                    <Tab value="Remote Signature">Remote Signature</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel value="Agreement">
                      <MonacoEditor
                        :static="
                          accNegotiation.agreement
                            ? accNegotiation.agreement
                            : accNegotiation.offer
                        "
                        :read-only="true"
                        :max-lines="35" />
                    </TabPanel>
                    <TabPanel
                      v-if="
                        localProof &&
                        localProof['algorithm'] === 'DataIntegrityProof'
                      "
                      value="Local Signature">
                      <MonacoEditor
                        :static="JSON.parse(localProof['digest'])"
                        :read-only="true"
                        :max-lines="35" />
                    </TabPanel>
                    <TabPanel
                      v-if="
                        remoteProof &&
                        remoteProof['algorithm'] === 'DataIntegrityProof'
                      "
                      value="Remote Signature">
                      <MonacoEditor
                        :static="JSON.parse(remoteProof['digest'])"
                        :read-only="true"
                        :max-lines="35" />
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </div>
              <div
                class="p-0 mt-6 col-span-12 xl:col-span-6 flex flex-wrap justify-center">
                <Timeline :value="accNegotiation.events">
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
                <Button
                  v-if="
                    accNegotiation.role === 'consumer' &&
                    accNegotiation.state === 'FINALIZED' &&
                    !userStore.isReadOnly
                  "
                  raised
                  type="button"
                  class="m-12 flex text-center justify-center p-4"
                  style="width: 60%; max-width: 60%; max-height: 60px"
                  label="Request Transfer"
                  severity="success"
                  @click="requestTransfer(accNegotiation)"></Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
      <ConfirmDialog group="selectDataplane">
        <template #message>
          <div
            class="flex flex-col items-center w-full gap-4 border-b border-surface-200 dark:border-surface-700">
            <p>
              Multiple data planes with the same type present. Select one of the
              data planes or keep at auto to let the control plane choose.
            </p>
            <Select
              v-model="dataPlaneSelection"
              :options="dataPlaneSelectionOptions"
              option-label="label"
              option-value="value"
              placeholder="Select Data Plane"
              class="w-full" />
          </div>
        </template>
      </ConfirmDialog>
    </template>
    <template v-else #content> There is no history to display</template>
  </Card>
</template>
