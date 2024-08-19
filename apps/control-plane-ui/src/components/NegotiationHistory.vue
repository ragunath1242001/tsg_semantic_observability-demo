<script setup lang="ts">
import utils from "../utils/common";

import {
  NegotiationDetailDto,
  INegotiationStatusDto,
} from "@tsg-dsp/control-plane-dtos";
import { ref, toRef } from "vue";
import { useToast } from "primevue/usetoast";
import http from "../utils/http";
import { DatasetDto, HashedMessage } from "@tsg-dsp/common-dsp";
import MonacoEditor from "@tsg-dsp/common-ui/components/MonacoEditor.vue";

const props = defineProps<{
  negotiations: INegotiationStatusDto[];
}>();

const negotiations = toRef(props, "negotiations");
const accNegotiation = ref<NegotiationDetailDto>();
const localProof = ref<HashedMessage>();
const remoteProof = ref<HashedMessage>();

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
    case "dspace:ACCEPTED":
      return "info";
    case "dspace:AGREED":
      return "primary";
    case "dspace:FINALIZED":
      return "success";
    case "dspace:OFFERED":
      return "contrast";
    case "dspace:REQUESTED":
      return "secondary";
    case "dspace:TERMINATED":
      return "danger";
    case "dspace:VERIFIED":
      return "warning";
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
  }
};

const requestTransfer = async (accNegotiation: NegotiationDetailDto) => {
  try {
    const address = accNegotiation.remoteAddress.split("negotiations")[0];
    const audience = accNegotiation.agreement["assigner"];
    const dataset = (
      await http.get<DatasetDto>(
        `management/catalog/dataset?address=${address}&id=${accNegotiation.agreement["target"]}&audience=${audience}`
      )
    ).data;
    const agreementId = accNegotiation.agreement["id"];
    const format = dataset["dcat:distribution"][0]["dct:format"];
    const response = await http.post(
      `management/transfers/request?address=${address}&agreementId=${agreementId}&format=${format}&audience=${audience}`
    );
    if (response.status == 200) {
      toast.add({
        severity: "success",
        summary: "Request sent",
        detail: "Successfully requested to start transfer process.",
        life: 3000,
      });
    }
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Failed to request transfer",
      detail: `${e.response ? e.response.data.message : e}`,
      life: 3000,
    });
    console.error("Error:", e);
    throw e;
  }
};
</script>
<template>
  <Card
    style="border-radius: 12px; border: 1px solid var(--surface-border)"
    class="mt-4"
  >
    <template #title><h5>Negotiation History</h5></template>
    <template #subtitle
      >Here you can find the history of the contract negotiations. Contracts
      that are finalized also allow the option to start a Transfer
      Process.</template
    >
    <template #content v-if="negotiations.length > 0">
      <Accordion @update:value="getNegotiation">
        <AccordionPanel
          v-for="(negotiation, index) in negotiations"
          :value="negotiation.localId"
        >
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
                  :value="utils.stripDspace(negotiation.state)"
                  :severity="getSeverity(negotiation.state)"
                />
                <small class="p-text-secondary">
                  {{ new Date(negotiation.modifiedDate).toLocaleDateString() }}
                </small>
              </div>
            </span>
          </AccordionHeader>
          <AccordionContent>
            <div
              class="flex items-stretch grid grid-cols-12 gap-4 card-container"
              v-if="accNegotiation"
            >
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
                        :max-lines="35"
                      />
                    </TabPanel>
                    <TabPanel
                      value="Local Signature"
                      v-if="
                        localProof &&
                        localProof['dspace:algorithm'] ===
                          'JsonWebSignature2020'
                      "
                    >
                      <MonacoEditor
                        :static="JSON.parse(localProof['dspace:digest'])"
                        :read-only="true"
                        :max-lines="35"
                      />
                    </TabPanel>
                    <TabPanel
                      value="Remote Signature"
                      v-if="
                        remoteProof &&
                        remoteProof['dspace:algorithm'] ===
                          'JsonWebSignature2020'
                      "
                    >
                      <MonacoEditor
                        :static="JSON.parse(remoteProof['dspace:digest'])"
                        :read-only="true"
                        :max-lines="35"
                      />
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </div>
              <div
                class="p-0 mt-6 col-span-12 xl:col-span-6 flex flex-wrap justify-center"
              >
                <Timeline :value="accNegotiation.events">
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
                <Button
                  @click="requestTransfer(accNegotiation)"
                  raised
                  type="button"
                  class="m-12 flex text-center justify-center p-4"
                  style="width: 60%; max-width: 60%"
                  label="Request Transfer"
                  severity="success"
                  v-if="
                    accNegotiation.role === 'consumer' &&
                    accNegotiation.state === 'dspace:FINALIZED'
                  "
                ></Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </template>
    <template #content v-else> There is no history to display</template>
  </Card>
</template>
