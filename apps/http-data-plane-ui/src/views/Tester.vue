<script setup lang="ts">
import { onMounted, ref } from "vue";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";

import { useToast } from "primevue/usetoast";
import { useDialog } from "primevue/usedialog";
import { TransferDto } from "@tsg-dsp/common-dtos";
import { AgreementDto, DatasetDto } from "@tsg-dsp/common-dsp";

import JSONDialog from "../components/JSONDialog.vue";
import { useRoute } from "vue-router";
import http from "@tsg-dsp/common-ui/utils/http";
import { useTransferStore } from "../stores/transfer";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import TesterComponent from "../components/TesterComponent.vue";

const toast = useToast();
const dialog = useDialog();
const route = useRoute();

const transfer = ref<TransferDto>();

const url = ref<string>("");

const headers = ref<{ key: string; value: string }[]>([]);

const metadataLoading = ref(false);

const metadata = ref<{ agreement: AgreementDto; dataset: DatasetDto }>();

const setHeader = (header: string, value: string) => {
  const contentTypeHeader = headers.value.find(
    (v) => v.key.toLowerCase() === header.toLowerCase()
  );
  if (contentTypeHeader) {
    contentTypeHeader.value = value;
  } else {
    headers.value.push({
      key: header,
      value: value
    });
  }
};

const fetchMetadata = async () => {
  metadataLoading.value = true;
  try {
    const response = await http.get<{
      agreement: AgreementDto;
      dataset: DatasetDto;
    }>(`management/transfers/${transfer.value.id}/metadata`);
    metadata.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error fetching metadata",
        defaultMessage: `Could not fetch metadata for this transfer ${transfer.value.id}`
      })
    );
  }
  metadataLoading.value = false;
};

const showAgreementDialog = () => {
  dialog.open(JSONDialog, {
    props: {
      header: "Raw ODRL Agreement",
      modal: true,
      dismissableMask: true
    },
    data: metadata.value.agreement
  });
};

const showDatasetDialog = () => {
  dialog.open(JSONDialog, {
    props: {
      header: "Raw DCAT Dataset",
      modal: true,
      dismissableMask: true
    },
    data: metadata.value.dataset
  });
};

onMounted(async () => {
  transfer.value = useTransferStore().transfer;
  if (transfer.value) {
    url.value = transfer.value.dataAddress?.["dspace:endpoint"];
    transfer.value.dataAddress?.["dspace:endpointProperties"]?.forEach((p) => {
      setHeader(p["dspace:name"], p["dspace:value"]);
    });
  } else if (route.params.id) {
    try {
      const transferResponse = await http.get(
        `/management/transfers/${route.params.id}`
      );
      transfer.value = transferResponse.data;
      url.value = transfer.value.dataAddress?.["dspace:endpoint"];
      transfer.value.dataAddress?.["dspace:endpointProperties"]?.forEach(
        (p) => {
          setHeader(p["dspace:name"], p["dspace:value"]);
        }
      );
    } catch (error) {
      toast.add(
        toastError({
          error,
          summary: "Could not load transfer",
          defaultMessage: `Could not load transfer with identifier ${route.params.id}`
        })
      );
    }
  } else {
    headers.value = [
      { key: "X-Dataset-Id", value: "" },
      { key: "X-Audience", value: "" }
    ];
  }
});
</script>

<template>
  <div>
    <Card>
      <template #title>Metadata</template>
      <template #subtitle>Fetch agreement and dataset metadata</template>
      <template #content>
        <Button
          label="Fetch metadata"
          :loading="metadataLoading"
          severity="success"
          @click="fetchMetadata" />
        <Tabs v-if="metadata" value="Agreement">
          <TabList>
            <Tab value="Agreement">Agreement</Tab>
            <Tab value="Dataset">Dataset</Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="Agreement">
              <FormField label="ID">{{ metadata.agreement["@id"] }}</FormField>
              <FormField label="Assigner">{{
                metadata.agreement["odrl:assigner"]
              }}</FormField>
              <FormField label="Assignee">{{
                metadata.agreement["odrl:assignee"]
              }}</FormField>
              <FormField label="Timestamp"
                >{{
                  new Date(
                    metadata.agreement["dspace:timestamp"]
                  ).toLocaleString()
                }}
              </FormField>
              <FormField label="Rules"
                >{{ metadata.agreement["odrl:permission"]?.length ?? 0 }}
                permissions,
                {{ metadata.agreement["odrl:prohibition"]?.length ?? 0 }}
                prohibitions,
                {{ metadata.agreement["odrl:obligation"]?.length ?? 0 }}
                obligations</FormField
              >
              <Button label="Show agreement" @click="showAgreementDialog" />
            </TabPanel>
            <TabPanel value="Dataset">
              <FormField label="ID">{{ metadata.dataset["@id"] }}</FormField>
              <FormField v-if="metadata.dataset['dct:title']" label="Title"
                >{{ metadata.dataset["dct:title"] }}
              </FormField>
              <FormField label="Distributions">
                <template
                  v-for="(distribution, idx) in metadata.dataset[
                    'dcat:distribution'
                  ]"
                  :key="idx">
                  <hr v-if="idx === 0" />
                  <FormField v-if="distribution['dct:title']" label="Title">{{
                    distribution["dct:title"]
                  }}</FormField>
                  <FormField v-if="distribution['dct:conformsTo']" label="Spec">
                    {{ distribution["dct:conformsTo"][0] }}</FormField
                  >
                  <hr />
                </template>
              </FormField>
              <Button label="Show dataset" @click="showDatasetDialog" />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </template>
    </Card>
    <TesterComponent :headers="headers" :url="url" :transfer="transfer" />
  </div>
</template>
