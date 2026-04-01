<script setup lang="ts">
import { CatalogDto, DatasetDto } from "@tsg-dsp/common-dsp";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { Skeleton, useDialog, useToast } from "primevue";
import { ref } from "vue";
import { computed, onMounted } from "vue";
import { parse } from "yaml";

import JSONDialog from "../components/JSONDialog.vue";
import { useRegistryStore } from "../stores/registry";
import {
  DereferencedOpenAPIObject,
  parseAndDereferenceOpenApiSpec
} from "../utils/openapi.parser";
import { Operation, pathsObjectToArray } from "../utils/openapi.utils";

const registryStore = useRegistryStore();
const toast = useToast();
const dialog = useDialog();

const emit = defineEmits<{
  (e: "dataset", value: { participantId: string; datasetId: string }): void;
  (e: "operation", operation: Operation): void;
}>();

const registryLoading = ref(true);
const availableParticipants = computed(() => {
  return registryStore.getOtherParticipants;
});

const loadingOpenApiSpec = ref(false);

const selectedParticipant = ref<string>();
const selectedParticipantCatalog = ref<CatalogDto>();
const selectedParticipantHTTPDatasets = ref<DatasetDto[]>();
const selectedDataset = ref<DatasetDto>();
const openApiSpec = ref<DereferencedOpenAPIObject>();
const operationFilter = ref<string>("");

const selectedDatasetDetails = computed(() => {
  if (!selectedDataset.value) {
    return null;
  }
  const {
    "@type": _type,
    "@id": _id,
    title,
    description,
    hasPolicy: _hasPolicy,
    distribution: _distribution,
    ...rest
  } = selectedDataset.value;
  // Clean up rest to create a Record<string, string> for display purposes
  const details: Record<string, ["field" | "json", string]> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      details[key] = ["field", value.toString()];
    } else if (Array.isArray(value)) {
      if (value.every((item) => typeof item === "string")) {
        details[key] = ["field", value.join(", ")];
      } else {
        details[key] = ["json", JSON.stringify(value, null, 2)];
      }
    } else {
      details[key] = ["json", JSON.stringify(value, null, 2)];
    }
  }
  return {
    title,
    description,
    details
  };
});

const operations = computed<Operation[]>(() => {
  if (!openApiSpec.value) {
    return [];
  }
  return pathsObjectToArray(openApiSpec.value.paths);
});

const filteredOperations = computed(() => {
  if (!operationFilter.value) {
    return operations.value;
  }
  const filter = operationFilter.value.toLowerCase();
  return operations.value.filter(
    (op) =>
      op.path.toLowerCase().includes(filter) ||
      op.operation.summary?.toLowerCase().includes(filter) ||
      op.operation.description?.toLowerCase().includes(filter)
  );
});
const selectedOperation = ref<Operation>();

const loadParticipant = async () => {
  registryLoading.value = true;
  try {
    const catalog = await registryStore.fetchParticipantCatalog(
      selectedParticipant.value
    );
    selectedParticipantCatalog.value = catalog;
    selectedParticipantHTTPDatasets.value = catalog.dataset.filter((d) =>
      d.distribution?.some((dist) => dist.format?.includes("HTTP"))
    );
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not load participant catalog",
        defaultMessage: `Could not load catalog for participant ${selectedParticipant.value}`
      })
    );
  } finally {
    registryLoading.value = false;
  }
};

const refreshRegistry = async () => {
  registryLoading.value = true;
  try {
    await registryStore.refreshRegistry();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not refresh registry",
        defaultMessage: `Could not refresh the federated catalog registry`
      })
    );
  } finally {
    registryLoading.value = false;
  }
};

const selectDataset = () => {
  const dataset = selectedDataset.value;
  emit("dataset", {
    participantId: selectedParticipant.value!,
    datasetId: dataset!["@id"]
  });
  if (
    dataset?.distribution?.[0]?.conformsTo &&
    dataset.distribution[0].conformsTo.length > 0
  ) {
    loadOpenAPISpecification(dataset.distribution[0].conformsTo[0]);
  }
};

const loadOpenAPISpecification = async (specUrl: string) => {
  loadingOpenApiSpec.value = true;
  try {
    const response = await http.get("management/openapi", {
      params: { url: specUrl }
    });
    if (typeof response.data === "string") {
      response.data = parse(response.data);
    }
    if (response.data && response.data.paths) {
      openApiSpec.value = parseAndDereferenceOpenApiSpec(response.data);
      operationFilter.value = "";
    } else {
      toast.add({
        summary: "Invalid OpenAPI specification",
        detail: `The OpenAPI specification at ${specUrl} is invalid or could not be parsed.`,
        life: 5000,
        severity: "error"
      });
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not load OpenAPI specification",
        defaultMessage: `Could not load OpenAPI specification from ${specUrl}`
      })
    );
  } finally {
    loadingOpenApiSpec.value = false;
  }
};

const selectOperation = (operation: Operation) => {
  selectedOperation.value = operation;
};

const configureOperation = () => {
  if (selectedOperation.value) {
    emit("operation", selectedOperation.value);
  }
};

const showOperationDetails = () => {
  try {
    JSON.stringify(selectedOperation.value.operation);
  } catch (error) {
    console.log(error);
    toast.add(
      toastError({
        error,
        summary: "Could not show operation details",
        defaultMessage: `Serialization of the operation object failed, possibly due to circular references.`
      })
    );
    return;
  }
  dialog.open(JSONDialog, {
    props: {
      header: `Operation Details - ${selectedOperation.value.method.toUpperCase()} ${
        selectedOperation.value.path
      }`,
      modal: true,
      dismissableMask: true
    },
    data: {
      content: selectedOperation.value.operation,
      note: {
        severity: "warn",
        message:
          "This is a dereferenced version of the operation object. This may differ from the original specification."
      }
    }
  });
};

const showPropertyJson = (key: string, value: any) => {
  dialog.open(JSONDialog, {
    props: {
      header: `Property Details - ${key}`,
      modal: true,
      dismissableMask: true
    },
    data: value
  });
};

onMounted(async () => {
  registryStore.initialize().then(() => {
    registryLoading.value = false;
  });
});
</script>

<template>
  <Card>
    <template #title>Search registry</template>
    <template #subtitle
      >Use the federated catalog to search for participants and their HTTP
      datasets</template
    >
    <template #content>
      <div class="flex flex-col gap-4">
        <FormField label="Select Participant">
          <div class="flex gap-2">
            <Select
              v-model="selectedParticipant"
              :options="availableParticipants"
              option-label="didId"
              option-value="didId"
              placeholder="Select participant"
              :disabled="registryLoading"
              :loading="registryLoading"
              filter-placeholder="Filter participants"
              filter
              class="flex-auto"
              @change="loadParticipant">
              <template #option="slotProps">
                <div class="flex flex-col">
                  <span class="font-semibold">{{
                    slotProps.option.didId
                  }}</span>
                  <small class="text-surface-500 dark:text-surface-400">{{
                    slotProps.option.address
                  }}</small>
                </div>
              </template>
            </Select>
            <Button
              label="Reload catalog"
              icon="pi pi-refresh"
              class="flex-none"
              :loading="registryLoading"
              @click="refreshRegistry" />
          </div>
        </FormField>
        <FormField v-if="selectedParticipantCatalog">
          <div class="flex flex-col">
            <span class="font-bold">{{
              selectedParticipantCatalog.title
            }}</span>
            <small class="italic text-surface-500 dark:text-surface-400">
              {{ selectedParticipantCatalog.description?.[0] }}
            </small>
          </div>
        </FormField>
        <FormField v-if="selectedParticipantCatalog" label="HTTP Datasets">
          <Select
            v-model="selectedDataset"
            :options="selectedParticipantHTTPDatasets"
            option-label="title"
            placeholder="Select dataset"
            :disabled="registryLoading"
            :loading="registryLoading"
            filter
            filter-placeholder="Filter datasets"
            class="w-full"
            @change="selectDataset">
            <template #option="slotProps">
              <div class="flex flex-col">
                <span class="font-semibold">{{ slotProps.option.title }}</span>
                <small class="text-surface-500 dark:text-surface-400">{{
                  slotProps.option.distribution?.[0]?.conformsTo?.join(", ")
                }}</small>
              </div>
            </template>
          </Select>
        </FormField>

        <Card
          v-if="selectedDatasetDetails"
          class="bg-surface-50 dark:bg-surface-800">
          <template #title>
            {{ selectedDatasetDetails.title }}
          </template>
          <template v-if="selectedDatasetDetails.description" #subtitle>
            <span
              v-for="(desc, index) in selectedDatasetDetails.description"
              :key="index"
              >{{ desc }}</span
            >
          </template>
          <template
            v-if="Object.keys(selectedDatasetDetails.details).length"
            #content>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <div
                v-for="(value, key) in selectedDatasetDetails.details"
                :key="key"
                class="flex flex-col py-1">
                <span
                  class="text-sm font-semibold text-surface-500 dark:text-surface-400">
                  {{ key }}
                </span>
                <span
                  class="text-surface-700 dark:text-surface-200 break-words">
                  <template v-if="value[0] === 'field'">
                    {{ value[1] }}
                  </template>
                  <template v-else-if="value[0] === 'json'">
                    <Button
                      label="View JSON"
                      variant="link"
                      size="small"
                      class="p-0!"
                      @click="showPropertyJson(key, value[1])" />
                  </template>
                </span>
              </div>
            </div>
          </template>
        </Card>

        <Skeleton v-if="loadingOpenApiSpec" height="200px" />
        <DataView
          v-else-if="operations.length"
          :value="filteredOperations"
          paginator
          :rows="10">
          <template #header>
            <div class="xl:flex justify-between gap-2">
              <IconField class="max-w-96 w-full">
                <InputIcon class="pi pi-search" />
                <InputText
                  v-model="operationFilter"
                  class="w-full"
                  placeholder="Filter operations or paths" />
              </IconField>
              <span
                v-if="openApiSpec"
                class="text-sm text-surface-500 dark:text-surface-400 py-3">
                {{ operations.length }} operations loaded from OpenAPI
                specification
              </span>
            </div>
          </template>
          <template #empty>
            <div class="flex flex-col items-center gap-3 py-10">
              <i class="pi pi-info-circle text-4xl text-surface-400" />
              <span class="text-lg text-surface-600 dark:text-surface-400">
                No operations found.
              </span>
            </div>
          </template>
          <template #list="slotProps: { items: Operation[] }">
            <div
              class="grid grid-cols-1 2xl:grid-cols-2 divide-y divide-x divide-(--p-dataview-border-color)">
              <div
                v-for="(item, index) in slotProps.items"
                :key="index"
                class="hover:bg-(--p-content-hover-background) cursor-pointer"
                :class="{
                  'bg-(--p-content-hover-background)':
                    selectedOperation &&
                    selectedOperation.path === item.path &&
                    selectedOperation.method === item.method
                }"
                @click="selectOperation(item)">
                <div class="p-3">
                  <div class="flex align-items-center mb-2 gap-3">
                    <span
                      class="font-bold w-14"
                      :class="{
                        'text-green-600': item.method === 'get',
                        'text-blue-600': item.method === 'post',
                        'text-yellow-600': item.method === 'put',
                        'text-red-600': item.method === 'delete',
                        'text-purple-600': item.method === 'patch',
                        'text-teal-600': item.method === 'options',
                        'text-gray-600': item.method === 'head',
                        'text-pink-600': item.method === 'trace'
                      }">
                      {{ item.method.toUpperCase() }}
                    </span>
                    <span class="font-mono font-semibold">{{ item.path }}</span>
                  </div>
                  <div>
                    <span v-if="item.operation.summary">{{
                      item.operation.summary
                    }}</span>
                    <p
                      v-if="item.operation.description"
                      class="truncate italic text-surface-600 dark:text-surface-400">
                      {{ item.operation.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </DataView>
        <Card
          v-if="selectedOperation"
          class="border-2 border-(--p-primary-color)">
          <template #title>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <Tag
                  :value="selectedOperation.method.toUpperCase()"
                  :severity="
                    selectedOperation.method === 'get'
                      ? 'success'
                      : selectedOperation.method === 'post'
                        ? 'info'
                        : selectedOperation.method === 'put'
                          ? 'warn'
                          : selectedOperation.method === 'delete'
                            ? 'danger'
                            : 'secondary'
                  "
                  class="font-bold" />
                <span class="font-mono text-xl">{{
                  selectedOperation.path
                }}</span>
              </div>
            </div>
          </template>
          <template #subtitle>
            <span v-if="selectedOperation.operation.summary" class="text-lg">{{
              selectedOperation.operation.summary
            }}</span>
          </template>
          <template #content>
            <div class="flex flex-col gap-4">
              <div v-if="selectedOperation.operation.description">
                <p class="text-surface-700 dark:text-surface-300">
                  {{ selectedOperation.operation.description }}
                </p>
              </div>

              <div v-if="selectedOperation.operation.parameters?.length">
                <h5 class="text-sm font-semibold mb-2">Parameters</h5>
                <DataTable
                  :value="selectedOperation.operation.parameters"
                  class="text-sm">
                  <Column field="name" header="Name">
                    <template #body="slotProps">
                      <span class="font-mono font-semibold">{{
                        slotProps.data.name
                      }}</span>
                    </template>
                  </Column>
                  <Column field="in" header="Location">
                    <template #body="slotProps">
                      <Tag :value="slotProps.data.in" severity="secondary" />
                    </template>
                  </Column>
                  <Column field="required" header="Required">
                    <template #body="slotProps">
                      <i
                        v-if="slotProps.data.required"
                        class="pi pi-check text-green-600" />
                      <i v-else class="pi pi-times text-surface-400" />
                    </template>
                  </Column>
                  <Column field="schema.type" header="Type">
                    <template #body="slotProps">
                      <span class="font-mono">{{
                        slotProps.data.schema?.type || "N/A"
                      }}</span>
                    </template>
                  </Column>
                  <Column field="description" header="Description">
                    <template #body="slotProps">
                      <span class="text-surface-600 dark:text-surface-400">{{
                        slotProps.data.description || "-"
                      }}</span>
                    </template>
                  </Column>
                </DataTable>
              </div>

              <div v-if="selectedOperation.operation.requestBody">
                <h5 class="text-lg font-semibold mb-2">Request Body</h5>
                <div class="bg-surface-50 dark:bg-surface-800 p-4 rounded">
                  <div class="mb-2">
                    <span class="font-semibold">Required: </span>
                    <Tag
                      :value="
                        selectedOperation.operation.requestBody.required
                          ? 'Yes'
                          : 'No'
                      "
                      :severity="
                        selectedOperation.operation.requestBody.required
                          ? 'warn'
                          : 'secondary'
                      " />
                  </div>
                  <div
                    v-if="selectedOperation.operation.requestBody.description"
                    class="mb-2">
                    <span class="font-semibold">Description: </span>
                    <span>{{
                      selectedOperation.operation.requestBody.description
                    }}</span>
                  </div>
                  <div v-if="selectedOperation.operation.requestBody.content">
                    <div class="flex gap-2 mt-2 flex-wrap">
                      <span class="font-semibold">Content Types:</span>
                      <Tag
                        v-for="contentType in Object.keys(
                          selectedOperation.operation.requestBody.content
                        )"
                        :key="contentType"
                        :value="contentType"
                        severity="info" />
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="selectedOperation.operation.responses">
                <h5 class="text-lg font-semibold mb-2">Responses</h5>
                <div class="flex flex-col gap-2">
                  <div
                    v-for="(response, statusCode) in selectedOperation.operation
                      .responses"
                    :key="statusCode"
                    class="bg-surface-50 dark:bg-surface-800 p-2 rounded">
                    <div class="flex items-center gap-2">
                      <Tag
                        :value="statusCode.toString()"
                        :severity="
                          statusCode.toString().startsWith('2')
                            ? 'success'
                            : statusCode.toString().startsWith('4')
                              ? 'warn'
                              : statusCode.toString().startsWith('5')
                                ? 'danger'
                                : 'info'
                        "
                        class="font-bold" />
                      <span v-if="response.description" class="font-semibold">{{
                        response.description
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="
                  selectedOperation.operation.deprecated ||
                  selectedOperation.operation.operationId
                "
                class="mt-2">
                <div
                  v-if="selectedOperation.operation.operationId"
                  class="mb-2">
                  <span class="text-sm font-semibold">Operation ID: </span>
                  <span class="font-mono text-sm">{{
                    selectedOperation.operation.operationId
                  }}</span>
                </div>
                <div v-if="selectedOperation.operation.deprecated">
                  <Message severity="warn" :closable="false">
                    This operation is deprecated
                  </Message>
                </div>
              </div>
              <div class="mt-2 flex gap-2 justify-between">
                <Button
                  label="Use operation in Tester"
                  severity="success"
                  icon="pi pi-cog"
                  @click="configureOperation" />
                <Button
                  label="Show operation details as JSON"
                  severity="info"
                  icon="pi pi-eye"
                  @click="showOperationDetails" />
              </div>
            </div>
          </template>
        </Card>
      </div>
    </template>
  </Card>
</template>
