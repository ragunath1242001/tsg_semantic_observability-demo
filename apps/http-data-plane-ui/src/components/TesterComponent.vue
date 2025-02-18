<script setup lang="ts">
import { computed, ref, toRefs } from "vue";
import KeyValuePairEdit from "@tsg-dsp/common-ui/components/KeyValuePairEdit.vue";
import axios, { AxiosResponse } from "axios";
import { httpStatusNames } from "@tsg-dsp/common-ui/utils/httpStatus";
import { useToast } from "primevue/usetoast";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { TransferDto } from "@tsg-dsp/common-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";

const toast = useToast();

const properties = defineProps<{
  headers: { key: string; value: string }[];
  url: string;
  transfer?: TransferDto;
}>();

const { headers, url, transfer } = toRefs(properties);
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

const truncatedData = computed(() => {
  if (response?.value?.axios?.data) {
    const data = response.value.axios.data;
    if (typeof data === "string") {
      return data.slice(0, 10240);
    } else {
      return data;
    }
  } else {
    return "";
  }
});

const removeHeader = (header: string) => {
  headers.value = headers.value.filter(
    (h) => h.key.toLowerCase() !== header.toLowerCase()
  );
};
</script>
<template>
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
          <MonacoEditorVue
            :static="truncatedData"
            :raw="typeof truncatedData === 'string'"
            :read-only="true"
            :max-lines="50" />
        </FormField>
      </template>
    </template>
  </Card>
</template>
