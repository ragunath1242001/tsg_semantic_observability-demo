<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import KeyValuePairEdit from "@tsg-dsp/common-ui/components/KeyValuePairEdit.vue";
import axios, { AxiosResponse } from "axios";
import { useToast } from "primevue/usetoast";
import { useDialog } from "primevue/usedialog";
import { TransferDto } from "@tsg-dsp/common-dtos";
import { axiosInstance, store } from "../store/index.js";
import { httpStatus } from "../utils/httpStatus";
import { AgreementDto, DatasetDto } from "@tsg-dsp/common-dsp";

import JSONDialog from "../components/JSONDialog.vue";
import { useRoute } from "vue-router";

const toast = useToast();
const dialog = useDialog();
const route = useRoute();

const transfer = ref<TransferDto>();

const interaction = ref<"direct" | "proxy">("direct");
const url = ref<string>("");
const path = ref<string>("");
const methods = ref<string[]>([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
const method = ref<
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"
>("GET");

const headers = ref<{ key: string; value: string }[]>([]);
const query = ref<{ key: string; value: string }[]>([]);

const bodyPairs = ref<{ key: string; value: string }[]>([]);
const bodyRaw = ref<string>("");
const bodyType = ref<"none" | "form-data" | "x-www-form-urlencoded" | "raw">(
  "none"
);

const loading = ref(false);
const metadataLoading = ref(false);

const metadata = ref<{ agreement: AgreementDto; dataset: DatasetDto }>();

const response = ref<{
  axios?: AxiosResponse;
  error?: Error;
  measuredTime?: number;
}>();

const bodyTypes = computed(() => {
  return [
    {
      value: "none",
      disabled: false,
    },
    {
      value: "form-data",
      disabled: !["POST", "PUT", "PATCH", "DELETE"].includes(method.value),
    },
    {
      value: "x-www-form-urlencoded",
      disabled: !["POST", "PUT", "PATCH", "DELETE"].includes(method.value),
    },
    {
      value: "raw",
      disabled: !["POST", "PUT", "PATCH", "DELETE"].includes(method.value),
    },
  ];
});

const fullUrl = computed(() => {
  if (interaction.value === "direct") {
    return `${url.value}/${path.value}`.replace(/([^:]\/)\/+/g, "$1");
  } else {
    return `${window.location.origin}/api/management/transfers/${transfer.value.id}/execute/${path.value}`.replace(
      /([^:]\/)\/+/g,
      "$1"
    );
  }
});

const truncatedData = computed(() => {
  if (response?.value?.axios?.data) {
    const data = response.value.axios.data;
    if (typeof data === "string") {
      return data.slice(0, 10240);
    } else {
      return data;
    }
  }
});

const removeHeader = (header: string) => {
  headers.value = headers.value.filter(
    (h) => h.key.toLowerCase() !== header.toLowerCase()
  );
};

const setHeader = (header: string, value: string) => {
  const contentTypeHeader = headers.value.find(
    (v) => v.key.toLowerCase() === header.toLowerCase()
  );
  if (contentTypeHeader) {
    contentTypeHeader.value = value;
  } else {
    headers.value.push({
      key: header,
      value: value,
    });
  }
};

const pairsToObject = (pairs: { key: string; value: string }[]) =>
  pairs.reduce(
    (accumulator, value) => ({ ...accumulator, [value.key]: value.value }),
    {}
  );

const interactionChange = () => {
  if (interaction.value === "direct") {
    if (transfer.value) {
      url.value = transfer.value.dataAddress?.["dspace:endpoint"];
      const authorization = transfer.value.dataAddress?.[
        "dspace:endpointProperties"
      ]?.find((p) => p["dspace:name"] === "Authorization");
      if (authorization) {
        setHeader("Authorization", authorization["dspace:value"]);
      }
    }
  } else {
    removeHeader("Authorization");
  }
};

const bodyTypeChange = () => {
  switch (bodyType.value) {
    case "none":
      removeHeader("Content-Type");
      break;
    case "form-data":
      setHeader("Content-Type", "multipart/form-data");
      break;
    case "x-www-form-urlencoded":
      setHeader("Content-Type", "application/x-www-form-urlencoded");
      break;
    case "raw":
      setHeader("Content-Type", "text/plain");
  }
};

const fetchMetadata = async () => {
  metadataLoading.value = true;
  try {
    const response = await axiosInstance.get<{
      agreement: AgreementDto;
      dataset: DatasetDto;
    }>(`management/transfers/${transfer.value.id}/metadata`);
    metadata.value = response.data;
  } catch (err) {
    const message =
      err.response?.data?.message ||
      "Could not fetch metadata for this transfer";
    toast.add({
      severity: "warn",
      summary: "Error fetching metadata",
      detail: message,
      life: 10000,
    });
  }
  metadataLoading.value = false;
};

const execute = async () => {
  loading.value = true;
  response.value = undefined;
  let data: string | Record<string, string> | FormData | undefined = undefined;
  switch (bodyType.value) {
    case "form-data":
      const form = new FormData();
      bodyPairs.value.forEach(({ key, value }) => {
        form.append(key, value);
      });
      data = form;
      break;
    case "x-www-form-urlencoded":
      data = pairsToObject(bodyPairs.value);
      break;
    case "raw":
      data = bodyRaw.value;
      break;
  }
  try {
    const start = new Date().getTime();
    const axiosResponse = await axios.request({
      method: method.value,
      url: fullUrl.value,
      headers: pairsToObject(headers.value),
      params: pairsToObject(query.value),
      data: data,
      validateStatus: null,
    });
    const stop = new Date().getTime();
    response.value = { axios: axiosResponse, measuredTime: stop - start };
  } catch (err) {
    response.value = { error: err as Error };
    const message =
      err.response?.data?.message ||
      "Could not execute the call to the remote data plane";
    toast.add({
      severity: "warn",
      summary: "Error executing call",
      detail: message,
      life: 10000,
    });
  }
  loading.value = false;
};

const showAgreementDialog = () => {
  dialog.open(JSONDialog, {
    props: {
      header: "Raw ODRL Agreement",
      modal: true,
      dismissableMask: true,
    },
    data: metadata.value.agreement,
  });
};

const showDatasetDialog = () => {
  dialog.open(JSONDialog, {
    props: {
      header: "Raw DCAT Dataset",
      modal: true,
      dismissableMask: true,
    },
    data: metadata.value.dataset,
  });
};

onMounted(async () => {
  transfer.value = store.state.transfer;
  if (transfer.value) {
    url.value = transfer.value.dataAddress?.["dspace:endpoint"];
    const authorization = transfer.value.dataAddress?.[
      "dspace:endpointProperties"
    ]?.find((p) => p["dspace:name"] === "Authorization");
    if (authorization) {
      setHeader("Authorization", authorization["dspace:value"]);
    }
  } else {
    try {
      const transferResponse = await axiosInstance.get(
        `/management/transfers/${route.params.id}`
      );
      transfer.value = transferResponse.data;
      url.value = transfer.value.dataAddress?.["dspace:endpoint"];
      const authorization = transfer.value.dataAddress?.[
        "dspace:endpointProperties"
      ]?.find((p) => p["dspace:name"] === "Authorization");
      if (authorization) {
        setHeader("Authorization", authorization["dspace:value"]);
      }
    } catch (err) {
      const message = err.response?.data?.message || "Could not load transfer";
      toast.add({
        severity: "warn",
        summary: "API error",
        detail: message,
        life: 10000,
      });
    }
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
          @click="fetchMetadata"
          severity="success"
        />
        <Tabs value="Agreement" v-if="metadata">
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
              <FormField label="Title" v-if="metadata.dataset['dct:title']"
                >{{ metadata.dataset["dct:title"] }}
              </FormField>
              <FormField label="Distributions">
                <template
                  v-for="(distribution, idx) in metadata.dataset[
                    'dcat:distribution'
                  ]"
                >
                  <hr v-if="idx === 0" />
                  <FormField label="Title" v-if="distribution['dct:title']">{{
                    distribution["dct:title"]
                  }}</FormField>
                  <FormField label="Spec" v-if="distribution['dct:conformsTo']">
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
    <Card class="mt-8">
      <template #title>HTTP Tester</template>
      <template #subtitle>HTTP Test Utility for testing transfers</template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="execute">
          <FormField v-if="transfer" label="Transfer">
            {{ transfer.id }}
          </FormField>
          <FormField label="URL">
            {{ fullUrl }}
          </FormField>
          <FormField label="Interaction" v-slot="props">
            <SelectButton
              :id="props.id"
              v-model="interaction"
              :options="['direct', 'proxy']"
              :allowEmpty="false"
              aria-labelledby="basic"
              @change="interactionChange"
            />
          </FormField>
          <FormField label="Path" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="path"
              placeholder="Path"
            />
          </FormField>
          <FormField label="Method" v-slot="props">
            <SelectButton
              :id="props.id"
              v-model="method"
              :options="methods"
              :allowEmpty="false"
              aria-labelledby="basic"
            />
          </FormField>
          <FormField label="Headers" class="mt-8" v-slot="props">
            <KeyValuePairEdit v-model="headers" />
          </FormField>
          <FormField label="Query Params" class="mt-8" v-slot="props">
            <KeyValuePairEdit v-model="query" />
          </FormField>
          <FormField label="Body" class="mt-8" v-slot="props">
            <SelectButton
              :id="props.id"
              v-model="bodyType"
              :options="bodyTypes"
              :allowEmpty="false"
              optionDisabled="disabled"
              option-label="value"
              option-value="value"
              aria-labelledby="basic"
              @change="bodyTypeChange"
            />
            <KeyValuePairEdit
              v-if="
                bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded'
              "
              v-model="bodyPairs"
            />
            <MonacoEditorVue
              v-if="bodyType === 'raw'"
              v-model="bodyRaw"
              :raw="true"
            />
          </FormField>
          <FormField no-label class="mt-8">
            <Button
              label="Execute"
              :loading="loading"
              @click="execute"
              severity="success"
              type="submit"
            />
          </FormField>
        </form>
      </template>
    </Card>
    <Card class="mt-8" v-if="response">
      <template #title>Response</template>
      <template #subtitle>HTTP Response</template>
      <template #content>
        <template v-if="response.error">
          <FormField label="Status">Exception</FormField>
          <FormField label="Name">{{ response.error.name }}</FormField>
          <FormField label="Message">{{ response.error.message }}</FormField>
        </template>
        <template v-else-if="response.axios">
          <FormField label="Status"
            >{{ response.axios.status }}
            {{ httpStatus[response.axios.status] }}</FormField
          >
          <FormField label="Time">{{ response.measuredTime }}ms</FormField>
          <FormField label="Headers">
            <DataTable :value="Object.entries(response.axios.headers)">
              <Column
                header="Key"
                style="
                  width: 35%;
                  max-width: 0;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                "
              >
                <template #body="props">{{ props.data[0] }}</template>
              </Column>
              <Column
                header="Value"
                style="
                  width: 65%;
                  max-width: 0;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                "
              >
                <template #body="props">{{ props.data[1] }}</template>
              </Column>
            </DataTable>
          </FormField>
          <FormField label="Body">
            <MonacoEditorVue
              :static="truncatedData"
              :raw="typeof truncatedData === 'string'"
              :read-only="true"
              :max-lines="50"
            />
          </FormField>
        </template>
      </template>
    </Card>
  </div>
</template>
