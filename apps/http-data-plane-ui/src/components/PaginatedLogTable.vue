<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { axiosInstance } from '../store';

import FormField from '../components/FormField.vue';
import { formatDate } from '../utils/date';
import { useDialog } from 'primevue/usedialog';
import JSONDialog from './JSONDialog.vue';
import { useToast } from 'primevue/usetoast';
import { httpStatus } from "../utils/httpStatus";

const props = defineProps<{ type: "ingress" | "egress", transferId?: string, datasetId?: string }>()
const dialog = useDialog();
const toast = useToast();

const loading = ref(false);
const page = ref(0);
const rows = ref(10);
const rowsPerPagesOptions = ref([5, 10, 15, 20, 25, 50])
const expandedRows = ref()
const columns = ref(['Date', 'Remote Party', 'Transfer', 'Dataset', 'Status', 'Method', 'Path'])
const selectedColumns = ref(['Date', 'Remote Party', 'Status', 'Method'])
const globalFilterFields = ref(['remoteParty', 'transfer', 'datasetId', 'status'])
const statusFilterOptions = ref(["2xx", "200", "201", "202", "203", "204", "205", "206", "3xx", "300", "301", "302", "303", "304", "305", "306", "307", "4xx", "400", "401", "402", "403", "404", "405", "406", "407", "408", "409", "410", "411", "412", "413", "414", "415", "416", "417", "418", "429", "5xx", "500", "501", "502", "503", "504", "505"])
const filters = ref({
  remoteParty: {
    value: '',
    matchMode: 'contains'
  },
  transferId: {
    value: props.transferId || '',
    matchMode: 'contains'
  },
  datasetId: {
    value: props.datasetId || '',
    matchMode: 'contains'
  },
  status: {
    value: '',
    matchMode: 'contains'
  },
});
const itemCount = ref(0);
const items = ref([]);
const first = ref(0);

const lazyLoad = async (event) => {
  loading.value = true;
  page.value = event.page ?? 0;
  if (event.rows) {
    rows.value = event.rows;
  }
  if (event.filters) {
    filters.value = event.filters;
  }
  try {
    const result = await axiosInstance.get(`/management/logging/${props.type}`, {
      params: {
        page: page.value + 1,
        take: rows.value,
        remoteParty: filters.value.remoteParty.value ? filters.value.remoteParty.value : undefined,
        transferId: filters.value.transferId.value ? filters.value.transferId.value : undefined,
        datasetId: filters.value.datasetId.value ? filters.value.datasetId.value : undefined,
        status: filters.value.status.value ? filters.value.status.value : undefined,
      }
    });
    itemCount.value = result.data.meta.itemCount;
    items.value = result.data.data;

  } catch (err) {
    console.log(err);
  }
  loading.value = false;
}
const onPage = (event) => {
  lazyLoad(event);
};
const onFilter = (event) => {
  lazyLoad(event);
};

const showTransfer = async (logEntry) => {
  try {
    logEntry.transferLoading = true;
    const transfer = await axiosInstance.get(`/management/transfers/${encodeURIComponent(logEntry.transferId)}`);
    dialog.open(JSONDialog, {
      props: {
        header: `Transfer ${logEntry.transferId}`,
        modal: true,
        dismissableMask: true
      },
      data: transfer.data
    });
  } catch (err) {
    const message = err.response?.data?.message || "Could not load transfer";
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: message,
      life: 10000,
    });
  }
  logEntry.transferLoading = false;
}

const showDataset = async (logEntry) => {
  try {
    logEntry.datasetLoading = true;
    const transfer = await axiosInstance.get(`/management/transfers/${encodeURIComponent(logEntry.transferId)}/metadata`);
    dialog.open(JSONDialog, {
      props: {
        header: `Transfer ${encodeURIComponent(logEntry.transferId)}`,
        modal: true,
        dismissableMask: true
      },
      data: transfer.data
    });
  } catch (err) {
    const message = err.response?.data?.message || "Could not load transfer metadata";
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: message,
      life: 10000,
    });
  }
  logEntry.datasetLoading = false;
}

const showDebug = (debug) => {
  dialog.open(JSONDialog, {
    props: {
      header: `Execution debug`,
      modal: true,
      dismissableMask: true
    },
    data: debug
  });
}

const statusSeverity = (status: number) => {
  if (status >= 100 && status < 200) {
    return "primary"
  } else if (status >= 200 && status < 300) {
    return "success"
  } else if (status >= 300 && status < 400) {
    return "info"
  } else if (status >= 400 && status < 500) {
    return "warning"
  } else {
    return "danger"
  }
}

const methodSeverity = (method: string) => {
  switch (method) {
    case 'GET':
    case 'HEAD':
    case 'OPTIONS':
      return "info"
    case 'POST':
      return 'success'
    case 'PATCH':
    case 'PUT':
      return 'warning'
    default:
      return 'danger'
  }
}

onMounted(async () => {
  await lazyLoad({});
})
</script>

<template>
  <DataTable v-model:expanded-rows="expandedRows" :value="items" lazy paginator v-model:filters="filters"
    :total-records="itemCount" :loading="loading" :first="first" data-key="identifier" @page="onPage" @filter="onFilter"
    filter-display="menu" :global-filter-fields="globalFilterFields" :rows="rows"
    :rows-per-page-options="rowsPerPagesOptions" resizableColumns columnResizeMode="fit">
    <template #paginatorend>
      <MultiSelect v-model="selectedColumns" :options="columns" placeholder="Select Columns" scrollHeight="350px"
        :maxSelectedLabels="0" :selectedItemsLabel="`{0} of ${columns.length} columns selected`" />
    </template>
    <Column expander style="width: 5rem" />
    <Column field="date" header="Date" :hidden="!selectedColumns.includes('Date')">
      <template #body="props">
        {{ formatDate(props.data.date, true) }}
      </template>
    </Column>
    <Column field="remoteParty" filterMatchMode="contains" :show-filter-match-modes="false" header="Remote Party"
      :hidden="!selectedColumns.includes('Remote Party')">
      <template #filter="{ filterModel, filterCallback }">
        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter"
          placeholder="Search" />
      </template>
    </Column>
    <Column field="transferId" filterMatchMode="contains" :show-filter-match-modes="false" header="Transfer"
      :hidden="!selectedColumns.includes('Transfer')">
      <template #filter="{ filterModel, filterCallback }">
        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter"
          placeholder="Search" />
      </template>
      <template #body="props">
        <Button style="font-family: 'Courier New', Courier, monospace; padding-block: 0.125rem;" class="text-xs" text
          size="small" :label="props.data.transferId" :loading="props.data.transferLoading"
          @click="showTransfer(props.data)" />
      </template>
    </Column>
    <Column field="datasetId" filterMatchMode="contains" :show-filter-match-modes="false" header="Dataset"
      :hidden="!selectedColumns.includes('Dataset')">
      <template #filter="{ filterModel, filterCallback }">
        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter"
          placeholder="Search" />
      </template>
      <template #body="props">
        <Button style="font-family: 'Courier New', Courier, monospace; padding-block: 0.125rem;" class="text-xs" text
          size="small" :label="props.data.datasetId" :loading="props.data.datasetLoading"
          @click="showDataset(props.data)" />
      </template>
    </Column>
    <Column field="status" filterMatchMode="contains" :show-filter-match-modes="false" header="Status"
      :hidden="!selectedColumns.includes('Status')">
      <template #filter="{ filterModel, filterCallback }">
        <Dropdown v-model="filterModel.value" @change="filterCallback()" :options="statusFilterOptions" editable
          placeholder="Search" />
      </template>
      <template #body="props">
        <Tag :severity="statusSeverity(props.data.status)" :value="props.data.status" />
      </template>
    </Column>
    <Column field="method" header="Method" :hidden="!selectedColumns.includes('Method')">
      <template #body="props">
        <Tag :severity="methodSeverity(props.data.method)" :value="props.data.method" />
      </template>
    </Column>
    <Column field="path" header="Path" :hidden="!selectedColumns.includes('Path')">
      <template #body="props">
        <code>/{{ props.data.path }}</code>
      </template>
    </Column>
    <template #expansion="props">
      <FormField label="Timestamp">{{ formatDate(props.data.date, true) }}</FormField>
      <FormField label="Remote Party"><code>{{ props.data.remoteParty }}</code></FormField>
      <FormField label="Transfer ID">
        <Button style="font-family: 'Courier New', Courier, monospace; padding-block: 0.125rem; margin-left: -1.25rem"
          text :label="props.data.transferId" :loading="props.data.transferLoading" @click="showTransfer(props.data)" />
      </FormField>
      <FormField label="Dataset ID">
        <Button style="font-family: 'Courier New', Courier, monospace; padding-block: 0.125rem; margin-left: -1.25rem"
          text :label="props.data.datasetId" :loading="props.data.datasetLoading" @click="showDataset(props.data)" />
      </FormField>
      <FormField label="Path">
        <code>/{{ props.data.path }}</code>
      </FormField>
      <FormField label="Method">
        <code>{{ props.data.method }}</code>
      </FormField>
      <FormField label="Status">
        <code>{{ props.data.status }} {{ httpStatus[props.data.status] }}</code>
      </FormField>
      <FormField label="Debug" v-if="props.data.debug">
        <Button style="padding-block: 0.125rem; margin-left: -1.25rem" text label="Show debug"
          @click="showDebug(props.data.debug)" />
      </FormField>
    </template>
  </DataTable>
</template>