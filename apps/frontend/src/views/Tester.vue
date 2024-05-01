<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import FormField from "../components/FormField.vue";
import KeyValuePairEdit from "../components/KeyValuePairEdit.vue";
import axios, { AxiosResponse } from "axios";
import { useToast } from "primevue/usetoast";
import { TransferDto } from "@libs/dtos";
import { store } from "../store/index.js";
import { httpStatus } from "../utils/httpStatus";

const toast = useToast();

const transfer = ref<TransferDto>();

const interaction = ref<'direct' | 'proxy'>('direct')
const url = ref<string>('')
const path = ref<string>('');
const methods = ref<string[]>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
const method = ref<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'>('GET');

const versions = ref<string[]>([]);
const version = ref<string>('0.0.0');

const headers = ref<{key: string, value: string}[]>([]);
const query = ref<{key: string, value: string}[]>([]);

const bodyPairs = ref<{key: string, value: string}[]>([]);
const bodyRaw = ref<string>('');
// const bodyTypes = ref<string[]>(['none', 'form-data', 'x-www-form-urlencoded', 'raw'])
const bodyType = ref<'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw'>('none')

const loading = ref(false);

const response = ref<{axios?: AxiosResponse, error?: Error}>();

const bodyTypes = computed(() => {
  return [{
    value: 'none',
    disabled: false
  },{
    value: 'form-data',
    disabled: !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.value)
  },{
    value: 'x-www-form-urlencoded',
    disabled: !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.value)
  },{
    value: 'raw',
    disabled: !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.value)
  },]
})

const fullUrl = computed(() => {
  if (interaction.value === 'direct') {
    return `${url.value}/${version.value}/${path.value}`.replace(/([^:]\/)\/+/g, "$1");
  } else {
    return `${window.location.origin}/api/management/transfers/${transfer.value.id}/execute/${version.value}/${path.value}`.replace(/([^:]\/)\/+/g, "$1");
  }
})

const removeHeader = (header: string) => {
  headers.value = headers.value.filter(h => h.key.toLowerCase() !== header.toLowerCase())
}

const setHeader = (header: string, value: string) => {
  const contentTypeHeader = headers.value.find(v => v.key.toLowerCase() === header.toLowerCase());
  if (contentTypeHeader) {
    contentTypeHeader.value = value;
  } else {
    headers.value.push({
      key: header,
      value: value
    })
  }
}

const pairsToObject = (pairs: {key: string, value: string}[]) => pairs.reduce((accumulator, value) => ({...accumulator, [value.key]: value.value}), {})

const interactionChange = () => {
  if (interaction.value === 'direct') {
      if (transfer.value) {
      url.value = transfer.value.dataAddress?.["dspace:endpoint"]
      const authorization = transfer.value.dataAddress?.["dspace:endpointProperties"]?.find(p => p["dspace:name"] === 'Authorization');
      if (authorization) {
        setHeader('Authorization', authorization["dspace:value"])
      }
      versions.value = []
    }
  } else {
    removeHeader('Authorization');
  }
}

const bodyTypeChange = () => {
  switch(bodyType.value) {
    case "none":
      removeHeader('Content-Type');
      break;
    case "form-data":
      setHeader('Content-Type','multipart/form-data');
      break;
    case "x-www-form-urlencoded":
      setHeader('Content-Type','application/x-www-form-urlencoded');
      break;
    case "raw":
      setHeader('Content-Type', 'text/plain');
  }
}

const execute = async () => {
  loading.value = true;
  let data: string | Record<string, string> | FormData | undefined = undefined
  switch(bodyType.value) {
    case "form-data":
      const form = new FormData();
      bodyPairs.value.forEach(({key, value}) => {
        form.append(key, value)
      })
      data = form;
      break;
    case "x-www-form-urlencoded":
      data = pairsToObject(bodyPairs.value)
      break;
    case "raw":
      data = bodyRaw.value
      break;
  }
  try {
    const axiosResponse = await axios.request({
        method: method.value,
        url: fullUrl.value,
        headers: pairsToObject(headers.value),
        params: pairsToObject(query.value),
        data: data,
        validateStatus: null,
      });
    response.value = {axios: axiosResponse};
  } catch (err) {
    response.value = {error: err as Error};
    toast.add({
      severity: "warn",
      summary: "Error executing call",
      detail: "Could not execute the call to the remote data plane",
      life: 10000,
    });
  }
  loading.value = false;
}

onMounted(() => {
  transfer.value = store.state.transfer;
  if (transfer.value) {
    url.value = transfer.value.dataAddress?.["dspace:endpoint"]
    const authorization = transfer.value.dataAddress?.["dspace:endpointProperties"]?.find(p => p["dspace:name"] === 'Authorization');
    if (authorization) {
      setHeader('Authorization', authorization["dspace:value"])
    }
    versions.value = []
  }
})
</script>

<template>
  <div>
    <Card>
      <template #title>HTTP Tester</template>
      <template #subtitle>HTTP Test Utility for testing transfers</template>
      <template #content>
        <FormField v-if="transfer" label="Transfer">
          {{ transfer.id }}
        </FormField>
        <FormField label="URL">
          {{ fullUrl }}
        </FormField>
        <FormField label="Interaction" v-slot="props">
          <SelectButton :id="props.id" v-model="interaction" :options="['direct', 'proxy']" :allowEmpty="false" aria-labelledby="basic" @change="interactionChange" />
        </FormField>
        <FormField label="Version" v-slot="props">
          <Dropdown required :id="props.id" class="w-full" v-model="version" :options="versions" editable placeholder="0.0.0" empty-message="No defined versions available"/>
        </FormField>
        <FormField label="Path" v-slot="props">
          <InputText :id="props.id" class="w-full" v-model="path" placeholder="Path"/>
        </FormField>
        <FormField label="Method" v-slot="props">
          <SelectButton :id="props.id" v-model="method" :options="methods" :allowEmpty="false" aria-labelledby="basic" />
        </FormField>
        <FormField label="Headers" class="mt-5" v-slot="props">
          <KeyValuePairEdit v-model="headers" />
        </FormField>
        <FormField label="Query Params" class="mt-5" v-slot="props">
          <KeyValuePairEdit v-model="query" />
        </FormField>
        <FormField label="Body" class="mt-5" v-slot="props">
          <SelectButton :id="props.id" v-model="bodyType" :options="bodyTypes" :allowEmpty="false" optionDisabled="disabled" option-label="value" option-value="value" aria-labelledby="basic" @change="bodyTypeChange"/>
          <KeyValuePairEdit v-if="bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded'" v-model="bodyPairs" />
          
          <Textarea
              v-if="bodyType === 'raw'"
              class="w-full"
              style="font-family: monospace"
              v-model="bodyRaw"
              placeholder="Raw body"
              rows="10"
            />
        </FormField>
        <FormField no-label class="mt-5">
          <Button label="Execute" :loading="loading" @click="execute" severity="success" type="submit" />
        </FormField>
      </template>
    </Card>
    <Card class="mt-5" v-if="response">
      <template #title>Response</template>
      <template #subtitle>HTTP Response</template>
      <template #content>
        <template v-if="response.error">
          <FormField label="Status">Exception</FormField>
          <FormField label="Name">{{ response.error.name }}</FormField>
          <FormField label="Message">{{ response.error.message }}</FormField>
        </template>
        <template v-else-if="response.axios">
          <FormField label="Status">{{ response.axios.status }} {{ httpStatus[response.axios.status] }}</FormField>
          <FormField label="Headers">
            <DataTable :value="Object.entries(response.axios.headers)">
              <Column header="Key" style="width: 35%; max-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><template #body="props">{{ props.data[0] }}</template></Column>
              <Column header="Value" style="width: 65%; max-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><template #body="props">{{ props.data[1] }}</template></Column>
            </DataTable>
          </FormField>
          <FormField label="Body">
            <pre>{{ response.axios.data }}</pre>
          </FormField>
        </template>
      </template>
    </Card>
  </div>
</template>