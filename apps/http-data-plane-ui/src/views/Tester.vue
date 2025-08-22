<script setup lang="ts">
import { AgreementDto, DatasetDto } from "@tsg-dsp/common-dsp";
import { TransferDto } from "@tsg-dsp/common-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useDialog } from "primevue/usedialog";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

const userStore = useUserStore();

import JSONDialog from "../components/JSONDialog.vue";
import TesterComponent from "../components/TesterComponent.vue";
import { useTransferStore } from "../stores/transfer";

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
    url.value = transfer.value.dataAddress?.endpoint;
    transfer.value.dataAddress?.endpointProperties?.forEach((p) => {
      setHeader(p.name, p.value);
    });
  } else if (route.params.id) {
    try {
      const transferResponse = await http.get(
        `/management/transfers/${route.params.id}`
      );
      transfer.value = transferResponse.data;
      url.value = transfer.value.dataAddress?.endpoint;
      transfer.value.dataAddress?.endpointProperties?.forEach((p) => {
        setHeader(p.name, p.value);
      });
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
  <div v-if="!userStore.isReadOnly">
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
                metadata.agreement.assigner
              }}</FormField>
              <FormField label="Assignee">{{
                metadata.agreement.assignee
              }}</FormField>
              <FormField label="Timestamp"
                >{{ new Date(metadata.agreement.timestamp).toLocaleString() }}
              </FormField>
              <FormField label="Rules"
                >{{ metadata.agreement.permission?.length ?? 0 }}
                permissions,
                {{ metadata.agreement.prohibition?.length ?? 0 }}
                prohibitions,
                {{ metadata.agreement.obligation?.length ?? 0 }}
                obligations</FormField
              >
              <Button label="Show agreement" @click="showAgreementDialog" />
            </TabPanel>
            <TabPanel value="Dataset">
              <FormField label="ID">{{ metadata.dataset["@id"] }}</FormField>
              <FormField v-if="metadata.dataset.title" label="Title"
                >{{ metadata.dataset.title }}
              </FormField>
              <FormField label="Distributions">
                <template
                  v-for="(distribution, idx) in metadata.dataset.distribution"
                  :key="idx">
                  <hr v-if="idx === 0" />
                  <FormField v-if="distribution.title" label="Title">{{
                    distribution.title
                  }}</FormField>
                  <FormField v-if="distribution.conformsTo" label="Spec">
                    {{ distribution.conformsTo[0] }}</FormField
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
  <div v-else>
    <Card>
      <template #title>Tester</template>
      <template #content>
        Since you are in read-only mode, you cannot send requests using the
        tester.
      </template>
    </Card>
  </div>
</template>
