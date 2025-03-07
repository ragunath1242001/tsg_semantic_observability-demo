<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { formatDate } from "@tsg-dsp/common-ui/utils/date";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import {
  httpStatusList,
  httpStatusNames
} from "@tsg-dsp/common-ui/utils/httpStatus";
import Select from "primevue/select";
import { useDialog } from "primevue/usedialog";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";

import JSONDialog from "./JSONDialog.vue";

const props = defineProps<{
  type: "ingress" | "egress";
  transferId?: string;
  datasetId?: string;
}>();
const dialog = useDialog();
const toast = useToast();

const loading = ref(false);
const page = ref(0);
const rows = ref(10);
const rowsPerPagesOptions = ref([5, 10, 15, 20, 25, 50]);
const expandedRows = ref();
const columns = ref([
  "Date",
  "Remote Party",
  "Transfer",
  "Dataset",
  "Status",
  "Method",
  "Path"
]);
const selectedColumns = ref(["Date", "Remote Party", "Status", "Method"]);
const globalFilterFields = ref([
  "remoteParty",
  "transfer",
  "datasetId",
  "status"
]);
const statusFilterOptions = ref(httpStatusList);
const filters = ref({
  remoteParty: {
    value: "",
    matchMode: "contains"
  },
  transferId: {
    value: props.transferId || "",
    matchMode: "contains"
  },
  datasetId: {
    value: props.datasetId || "",
    matchMode: "contains"
  },
  status: {
    value: "",
    matchMode: "contains"
  }
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
    const result = await http.get(`/management/logging/${props.type}`, {
      params: {
        page: page.value + 1,
        take: rows.value,
        remoteParty: filters.value.remoteParty.value
          ? filters.value.remoteParty.value
          : undefined,
        transferId: filters.value.transferId.value
          ? filters.value.transferId.value
          : undefined,
        datasetId: filters.value.datasetId.value
          ? filters.value.datasetId.value
          : undefined,
        status: filters.value.status.value
          ? filters.value.status.value
          : undefined
      }
    });
    itemCount.value = result.data.meta.itemCount;
    items.value = result.data.data;
  } catch (err) {
    console.log(err);
  }
  loading.value = false;
};
const onPage = (event) => {
  lazyLoad(event);
};
const onFilter = (event) => {
  lazyLoad(event);
};

const showTransfer = async (logEntry) => {
  try {
    logEntry.transferLoading = true;
    const transfer = await http.get(
      `/management/transfers/${encodeURIComponent(logEntry.transferId)}`
    );
    dialog.open(JSONDialog, {
      props: {
        header: `Transfer ${logEntry.transferId}`,
        modal: true,
        dismissableMask: true
      },
      data: transfer.data
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not load transfer",
        defaultMessage: `Could not load transfer with identifier ${logEntry.transferId}`
      })
    );
  }
  logEntry.transferLoading = false;
};

const showDataset = async (logEntry) => {
  try {
    logEntry.datasetLoading = true;
    const transfer = await http.get(
      `/management/transfers/${encodeURIComponent(
        logEntry.transferId
      )}/metadata`
    );
    dialog.open(JSONDialog, {
      props: {
        header: `Transfer ${encodeURIComponent(logEntry.transferId)}`,
        modal: true,
        dismissableMask: true
      },
      data: transfer.data
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not load transfer metadata",
        defaultMessage: `Could not load transfer with identifier ${logEntry.transferId}`
      })
    );
  }
  logEntry.datasetLoading = false;
};

const showDebug = (debug) => {
  dialog.open(JSONDialog, {
    props: {
      header: `Execution debug`,
      modal: true,
      dismissableMask: true
    },
    data: debug
  });
};

const statusSeverity = (status: number) => {
  if (status >= 100 && status < 200) {
    return "primary";
  } else if (status >= 200 && status < 300) {
    return "success";
  } else if (status >= 300 && status < 400) {
    return "info";
  } else if (status >= 400 && status < 500) {
    return "warn";
  } else {
    return "danger";
  }
};

const methodSeverity = (method: string) => {
  switch (method) {
    case "GET":
    case "HEAD":
    case "OPTIONS":
      return "info";
    case "POST":
      return "success";
    case "PATCH":
    case "PUT":
      return "warn";
    default:
      return "danger";
  }
};

onMounted(async () => {
  await lazyLoad({});
});
</script>

<template>
  <DataTable
    v-model:expanded-rows="expandedRows"
    v-model:filters="filters"
    :value="items"
    lazy
    paginator
    :total-records="itemCount"
    :loading="loading"
    :first="first"
    data-key="identifier"
    filter-display="menu"
    :global-filter-fields="globalFilterFields"
    :rows="rows"
    :rows-per-page-options="rowsPerPagesOptions"
    resizable-columns
    column-resize-mode="fit"
    @page="onPage"
    @filter="onFilter">
    <template #paginatorend>
      <MultiSelect
        v-model="selectedColumns"
        :options="columns"
        placeholder="Select Columns"
        scroll-height="350px"
        :max-selected-labels="0"
        :selected-items-label="`{0} of ${columns.length} columns selected`" />
    </template>
    <Column expander style="width: 5rem" />
    <Column
      field="date"
      header="Date"
      :hidden="!selectedColumns.includes('Date')">
      <template #body="props">
        {{ formatDate(props.data.date, true) }}
      </template>
    </Column>
    <Column
      field="remoteParty"
      filter-match-mode="contains"
      :show-filter-match-modes="false"
      header="Remote Party"
      :hidden="!selectedColumns.includes('Remote Party')">
      <template #filter="{ filterModel, filterCallback }">
        <InputText
          v-model="filterModel.value"
          type="text"
          class="p-column-filter"
          placeholder="Search"
          @keydown.enter="filterCallback()" />
      </template>
    </Column>
    <Column
      field="transferId"
      filter-match-mode="contains"
      :show-filter-match-modes="false"
      header="Transfer"
      :hidden="!selectedColumns.includes('Transfer')">
      <template #filter="{ filterModel, filterCallback }">
        <InputText
          v-model="filterModel.value"
          type="text"
          class="p-column-filter"
          placeholder="Search"
          @keydown.enter="filterCallback()" />
      </template>
      <template #body="props">
        <Button
          style="
            font-family: &quot;Courier New&quot;, Courier, monospace;
            padding-block: 0.125rem;
          "
          class="text-xs"
          text
          size="small"
          :label="props.data.transferId"
          :loading="props.data.transferLoading"
          @click="showTransfer(props.data)" />
      </template>
    </Column>
    <Column
      field="datasetId"
      filter-match-mode="contains"
      :show-filter-match-modes="false"
      header="Dataset"
      :hidden="!selectedColumns.includes('Dataset')">
      <template #filter="{ filterModel, filterCallback }">
        <InputText
          v-model="filterModel.value"
          type="text"
          class="p-column-filter"
          placeholder="Search"
          @keydown.enter="filterCallback()" />
      </template>
      <template #body="props">
        <Button
          style="
            font-family: &quot;Courier New&quot;, Courier, monospace;
            padding-block: 0.125rem;
          "
          class="text-xs"
          text
          size="small"
          :label="props.data.datasetId"
          :loading="props.data.datasetLoading"
          @click="showDataset(props.data)" />
      </template>
    </Column>
    <Column
      field="status"
      filter-match-mode="contains"
      :show-filter-match-modes="false"
      header="Status"
      :hidden="!selectedColumns.includes('Status')">
      <template #filter="{ filterModel, filterCallback }">
        <Select
          v-model="filterModel.value"
          :options="statusFilterOptions"
          editable
          placeholder="Search"
          @change="filterCallback()" />
      </template>
      <template #body="props">
        <Tag
          :severity="statusSeverity(props.data.status)"
          :value="props.data.status" />
      </template>
    </Column>
    <Column
      field="method"
      header="Method"
      :hidden="!selectedColumns.includes('Method')">
      <template #body="props">
        <Tag
          :severity="methodSeverity(props.data.method)"
          :value="props.data.method" />
      </template>
    </Column>
    <Column
      field="path"
      header="Path"
      :hidden="!selectedColumns.includes('Path')">
      <template #body="props">
        <code>/{{ props.data.path }}</code>
      </template>
    </Column>
    <template #expansion="props">
      <FormField label="Timestamp">{{
        formatDate(props.data.date, true)
      }}</FormField>
      <FormField label="Remote Party"
        ><code>{{ props.data.remoteParty }}</code></FormField
      >
      <FormField label="Transfer ID">
        <Button
          style="
            font-family: &quot;Courier New&quot;, Courier, monospace;
            padding-block: 0.125rem;
            margin-left: -1.25rem;
          "
          text
          :label="props.data.transferId"
          :loading="props.data.transferLoading"
          @click="showTransfer(props.data)" />
      </FormField>
      <FormField label="Dataset ID">
        <Button
          style="
            font-family: &quot;Courier New&quot;, Courier, monospace;
            padding-block: 0.125rem;
            margin-left: -1.25rem;
          "
          text
          :label="props.data.datasetId"
          :loading="props.data.datasetLoading"
          @click="showDataset(props.data)" />
      </FormField>
      <FormField label="Path">
        <code>/{{ props.data.path }}</code>
      </FormField>
      <FormField label="Method">
        <code>{{ props.data.method }}</code>
      </FormField>
      <FormField label="Status">
        <code
          >{{ props.data.status }}
          {{ httpStatusNames[props.data.status] }}</code
        >
      </FormField>
      <FormField v-if="props.data.debug" label="Debug">
        <Button
          style="padding-block: 0.125rem; margin-left: -1.25rem"
          text
          label="Show debug"
          @click="showDebug(props.data.debug)" />
      </FormField>
    </template>
  </DataTable>
</template>
