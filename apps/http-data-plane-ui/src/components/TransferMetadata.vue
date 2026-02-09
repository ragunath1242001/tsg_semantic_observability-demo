<script setup lang="ts">
import { AgreementDto, DatasetDto } from "@tsg-dsp/common-dsp";
import { TransferDto } from "@tsg-dsp/common-dtos";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useDialog, useToast } from "primevue";
import { ref } from "vue";

import JSONDialog from "../components/JSONDialog.vue";

const toast = useToast();
const dialog = useDialog();

const props = defineProps({
  transfer: { type: TransferDto, required: true }
});

const metadataLoading = ref(false);

const metadata = ref<{ agreement: AgreementDto; dataset: DatasetDto }>();

const fetchMetadata = async () => {
  metadataLoading.value = true;
  try {
    const response = await http.get<{
      agreement: AgreementDto;
      dataset: DatasetDto;
    }>(`management/transfers/${props.transfer.id}/metadata`);
    metadata.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error fetching metadata",
        defaultMessage: `Could not fetch metadata for this transfer ${props.transfer.id}`
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
</script>

<template>
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
</template>
