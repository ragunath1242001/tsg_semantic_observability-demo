<script setup lang="ts">
import { TransferDto } from "@tsg-dsp/common-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import KeyValuePairEdit from "@tsg-dsp/common-ui/components/KeyValuePairEdit.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { httpStatusNames } from "@tsg-dsp/common-ui/utils/httpStatus";
import axios, { AxiosResponse } from "axios";
import { DynamicDialogCloseOptions } from "primevue/dynamicdialogoptions";
import { useDialog } from "primevue/usedialog";
import { useToast } from "primevue/usetoast";
import { computed, nextTick, onMounted, ref, toRefs, watch } from "vue";

import PathParametersDialog from "../components/PathParametersDialog.vue";
import { DereferencedParameterObject } from "../utils/openapi.parser";
import { type Operation, requestBodyToTester } from "../utils/openapi.utils";

const toast = useToast();
const dialog = useDialog();

const properties = defineProps<{
  headers: { key: string; value: string }[];
  url: string;
  transfer?: TransferDto;
  operation?: Operation;
}>();

const { headers, url, transfer, operation } = toRefs(properties);
const interaction = ref<"direct" | "proxy">("direct");
const path = ref<string>("");
const methods = ref<string[]>([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS"
]);
const method = ref<
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"
>("GET");
const query = ref<{ key: string; value: string }[]>([]);

const bodyPairs = ref<{ key: string; value: string }[]>([]);
const bodyRaw = ref<string>("");
const bodyType = ref<"none" | "form-data" | "x-www-form-urlencoded" | "raw">(
  "none"
);

const bodySchema = ref();
const bodyLanguage = ref<string>("json");

const loading = ref(false);

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

const execute = async () => {
  loading.value = true;
  response.value = undefined;
  let data: string | Record<string, string> | FormData | undefined = undefined;
  switch (bodyType.value) {
    case "form-data": {
      const form = new FormData();
      bodyPairs.value.forEach(({ key, value }) => {
        form.append(key, value);
      });
      data = form;
      break;
    }
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
      validateStatus: null
    });
    const stop = new Date().getTime();
    response.value = { axios: axiosResponse, measuredTime: stop - start };
  } catch (error) {
    response.value = { error: error as Error };
    toast.add(
      toastError({
        error,
        summary: "Error executing call",
        defaultMessage: `Could not execute the call to the remote data plane`
      })
    );
  }
  loading.value = false;
};
const pairsToObject = (pairs: { key: string; value: string }[]) =>
  pairs.reduce(
    (accumulator, value) => ({ ...accumulator, [value.key]: value.value }),
    {}
  );

const interactionChange = () => {
  if (interaction.value === "direct") {
    if (transfer.value) {
      url.value = transfer.value.dataAddress?.endpoint;
      transfer.value.dataAddress?.endpointProperties?.forEach((p) => {
        setHeader(p.name, p.value);
      });
    }
  } else {
    if (transfer.value) {
      transfer.value.dataAddress?.endpointProperties?.forEach((p) => {
        removeHeader(p.name);
      });
    } else {
      removeHeader("Authorization");
    }
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
const response = ref<{
  axios?: AxiosResponse;
  error?: Error;
  measuredTime?: number;
}>();

const bodyTypes = computed(() => {
  return [
    {
      value: "none",
      disabled: false
    },
    {
      value: "form-data",
      disabled: !["POST", "PUT", "PATCH", "DELETE"].includes(method.value)
    },
    {
      value: "x-www-form-urlencoded",
      disabled: !["POST", "PUT", "PATCH", "DELETE"].includes(method.value)
    },
    {
      value: "raw",
      disabled: !["POST", "PUT", "PATCH", "DELETE"].includes(method.value)
    }
  ];
});

const fullUrl = computed(() => {
  if (transfer.value) {
    if (interaction.value === "direct") {
      return `${url.value}/${path.value}`.replace(/([^:]\/)\/+/g, "$1");
    } else
      return `${window.location.origin}${window.location.pathname}api/management/transfers/${transfer.value.id}/execute/${path.value}`.replace(
        /([^:]\/)\/+/g,
        "$1"
      );
  } else {
    return `${window.location.origin}${window.location.pathname}api/management/execute/${path.value}`.replace(
      /([^:]\/)\/+/g,
      "$1"
    );
  }
});

const MAX_DISPLAY_SIZE = 10240;

const rawResponseData = computed(() => {
  const data = response.value?.axios?.data;
  if (!data) return "";
  return typeof data === "string" ? data : JSON.stringify(data, null, 2);
});

const truncatedData = computed(() => {
  const data = rawResponseData.value;
  return data.length > MAX_DISPLAY_SIZE
    ? data.slice(0, MAX_DISPLAY_SIZE)
    : data;
});

const isDataTruncated = computed(() => {
  return rawResponseData.value.length > MAX_DISPLAY_SIZE;
});

const downloadFullResponse = () => {
  const data = rawResponseData.value;
  if (!data) return;
  const contentType =
    response.value?.axios?.headers?.["content-type"]?.split(";")[0]?.trim() ??
    "application/octet-stream";
  const extMap: Record<string, string> = {
    "application/json": ".json",
    "application/xml": ".xml",
    "text/xml": ".xml",
    "text/html": ".html",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/svg+xml": ".svg"
  };
  const ext = extMap[contentType] ?? ".bin";
  const blob = new Blob([data], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `response-body${ext}`;
  a.click();
  URL.revokeObjectURL(url);
};

const removeHeader = (header: string) => {
  headers.value = headers.value.filter(
    (h) => h.key.toLowerCase() !== header.toLowerCase()
  );
};

const showPathParamDialog = async (
  operation: Operation,
  pathParams: DereferencedParameterObject[]
) => {
  const dialogResult = await new Promise<Record<string, string> | null>(
    (resolve) => {
      dialog.open(PathParametersDialog, {
        props: {
          header: `Fill in path parameters - ${operation.method.toUpperCase()} ${
            operation.path
          }`,
          modal: true,
          dismissableMask: true,
          closable: true
        },
        data: { parameters: pathParams },
        onClose: (options?: DynamicDialogCloseOptions) => {
          resolve(options?.data || null);
        }
      });
    }
  );

  if (!dialogResult) {
    // User cancelled
    return operation.path;
  }
  let finalPath = operation.path;
  // Replace path parameters with provided values
  for (const [name, value] of Object.entries(dialogResult)) {
    finalPath = finalPath.replace(`{${name}}`, encodeURIComponent(value));
  }
  return finalPath;
};

const selectOperation = async (operation: Operation) => {
  // Extract path, query, and header parameters
  const pathParams =
    operation.operation.parameters?.filter((p) => p.in === "path") || [];
  const queryParams =
    operation.operation.parameters?.filter((p) => p.in === "query") || [];
  const headerParams =
    operation.operation.parameters?.filter((p) => p.in === "header") || [];

  // Set the path
  path.value =
    pathParams.length > 0
      ? await showPathParamDialog(operation, pathParams)
      : operation.path;

  // Set the HTTP method
  method.value = operation.method.toUpperCase() as
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE"
    | "HEAD"
    | "OPTIONS";

  // Add headers
  for (const headerParam of headerParams) {
    const value = headerParam.example
      ? String(headerParam.example)
      : headerParam.schema?.example
        ? String(headerParam.schema.example)
        : "";

    setHeader(headerParam.name, value);
  }

  // Add query parameters
  query.value = queryParams.map((param) => ({
    key: param.name,
    value: param.example
      ? String(param.example)
      : param.schema?.example
        ? String(param.schema.example)
        : param.schema?.default
          ? String(param.schema.default)
          : ""
  }));

  // Handle request body
  const requestBody = operation.operation.requestBody;
  if (requestBody && requestBody.content) {
    const {
      bodyLanguage: newBodyLanguage,
      bodyType: newBodyType,
      bodySchema: newBodySchema,
      headers: newHeaders
    } = requestBodyToTester(requestBody, bodyRaw, toast);
    bodyType.value = newBodyType;
    bodyLanguage.value = newBodyLanguage;
    bodySchema.value = newBodySchema;
    newHeaders.forEach((h) => setHeader(h.key, h.value));
  } else {
    bodyType.value = "none";
  }

  // scroll to TesterComponent
  await nextTick();
  const testerElement = document.getElementById("tester-form");
  testerElement?.scrollIntoView({ behavior: "smooth" });
};

watch(
  () => operation.value,
  () => {
    if (operation.value) {
      selectOperation(operation.value);
    }
  }
);

onMounted(async () => {
  if (operation.value) {
    await selectOperation(operation.value);
  }
});
</script>
<template>
  <Card class="mt-8">
    <template #title>HTTP Tester</template>
    <template #subtitle>HTTP Test Utility for testing transfers</template>
    <template #content>
      <form
        id="tester-form"
        class="flex flex-col gap-4"
        style="scroll-margin-top: 12rem"
        @submit.prevent="execute">
        <FormField v-if="transfer" label="Transfer">
          {{ transfer.id }}
        </FormField>
        <FormField label="URL">
          {{ fullUrl }}
        </FormField>
        <FormField v-if="transfer" label="Interaction">
          <SelectButton
            v-model="interaction"
            :options="['direct', 'proxy']"
            :allow-empty="false"
            aria-labelledby="basic"
            @change="interactionChange" />
        </FormField>
        <FormField label="Path">
          <InputText v-model="path" class="w-full" placeholder="Path" />
        </FormField>
        <FormField label="Method">
          <SelectButton
            v-model="method"
            :options="methods"
            :allow-empty="false"
            aria-labelledby="basic" />
        </FormField>
        <FormField label="Headers" class="mt-8">
          <KeyValuePairEdit v-model="headers" />
        </FormField>
        <FormField label="Query Params" class="mt-8">
          <KeyValuePairEdit v-model="query" />
        </FormField>
        <FormField label="Body" class="mt-8">
          <SelectButton
            v-model="bodyType"
            :options="bodyTypes"
            :allow-empty="false"
            option-disabled="disabled"
            option-label="value"
            option-value="value"
            aria-labelledby="basic"
            @change="bodyTypeChange" />
          <KeyValuePairEdit
            v-if="
              bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded'
            "
            v-model="bodyPairs" />
          <MonacoEditorVue
            v-if="bodyType === 'raw'"
            v-model="bodyRaw"
            :schema="bodySchema"
            :language="bodyLanguage"
            :max-lines="30"
            :raw="true" />
        </FormField>
        <FormField no-label class="mt-8">
          <Button
            label="Execute"
            :loading="loading"
            severity="success"
            type="submit"
            @click="execute" />
        </FormField>
      </form>
    </template>
  </Card>
  <Card v-if="response" class="mt-8">
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
          {{ httpStatusNames[response.axios.status] }}</FormField
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
              ">
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
              ">
              <template #body="props">{{ props.data[1] }}</template>
            </Column>
          </DataTable>
        </FormField>
        <FormField label="Body">
          <Message
            v-if="isDataTruncated"
            severity="warn"
            :closable="false"
            class="mb-2">
            The response body has been truncated for display.
            <Button
              label="Download full response"
              severity="warn"
              text
              size="small"
              icon="pi pi-download"
              class="ml-2"
              @click="downloadFullResponse" />
          </Message>
          <MonacoEditorVue
            :static="truncatedData"
            :raw="true"
            :read-only="true"
            :max-lines="50" />
        </FormField>
      </template>
    </template>
  </Card>
</template>
