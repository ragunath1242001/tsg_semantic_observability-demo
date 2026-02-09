<script setup lang="ts">
import { TransferDto } from "@tsg-dsp/common-dtos";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useToast } from "primevue/usetoast";
import { nextTick, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import CatalogViewer from "../components/CatalogViewer.vue";
import TesterComponent from "../components/TesterComponent.vue";
import TransferMetadata from "../components/TransferMetadata.vue";
import { useTransferStore } from "../stores/transfer";
import { Operation } from "../utils/openapi.utils";

const userStore = useUserStore();

const toast = useToast();
const route = useRoute();

const transfer = ref<TransferDto>();

const url = ref<string>("");

const headers = ref<{ key: string; value: string }[]>([]);

const selectedOperation = ref<Operation>();

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

const addOrUpdateHeader = (key: string, value: string) => {
  const existingHeader = headers.value.find(
    (h) => h.key.toLowerCase() === key.toLowerCase()
  );
  if (existingHeader) {
    existingHeader.value = value;
  } else {
    headers.value.push({ key, value });
  }
};

const selectDataset = ({
  participantId,
  datasetId
}: {
  participantId: string;
  datasetId: string;
}) => {
  addOrUpdateHeader("X-Dataset-Id", datasetId);
  addOrUpdateHeader("X-Audience", participantId);
};

const selectOperation = async (operation: Operation) => {
  selectedOperation.value = undefined;
  await nextTick();
  selectedOperation.value = operation;
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
    <TransferMetadata v-if="transfer" :transfer="transfer" />
    <CatalogViewer
      v-else
      @dataset="selectDataset"
      @operation="selectOperation" />
    <TesterComponent
      :headers="headers"
      :url="url"
      :transfer="transfer"
      :operation="selectedOperation" />
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
