<script setup lang="ts">
import { DataPlaneStateDto } from "@tsg-dsp/common-dtos";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import {
  CollectionDatasetConfig,
  DatasetItem,
  DatasetItemWithDto
} from "@tsg-dsp/http-data-plane-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { useConfirm, useDialog, useToast } from "primevue";
import { onMounted, ref } from "vue";
import PolicyEditor from "./PolicyEditor.vue";
import { pushOrCreate } from "../utils/arrays";
import PolicyView from "./PolicyView.vue";
import { cleanPolicyConfig } from "../utils/policyconfig";
import JSONDialog from "./JSONDialog.vue";

const toast = useToast();
const confirm = useConfirm();
const dialog = useDialog();

const props = defineProps({
  state: DataPlaneStateDto,
  config: CollectionDatasetConfig
});
const emits = defineEmits(["update"]);

const updateLoading = ref(false);
const refreshLoading = ref(false);

const editConfigModal = ref(false);
const configForm = ref<CollectionDatasetConfig>();

const editDatasetModal = ref(false);
const editModalLoading = ref(false);
const datasetForm = ref<DatasetItem & { isNew: boolean }>();

const datasets = ref<DatasetItemWithDto[]>([]);

const getDatasets = async () => {
  try {
    const response = await http.get<DatasetItemWithDto[]>(
      "management/datasets"
    );
    datasets.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Fetching datasets failed",
        defaultMessage: `Could not fetch datasets from the HTTP data plane`
      })
    );
  }
};

const refreshRegistration = async () => {
  refreshLoading.value = true;
  try {
    await http.post("management/refresh");
    emits("update");
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Refreshing registration failed",
        defaultMessage: `Could not refresh registration at the HTTP data plane`
      })
    );
  }
  refreshLoading.value = false;
};

const openDatasetEditModal = (dataset?: DatasetItemWithDto) => {
  datasetForm.value = dataset
    ? {
        ...dataset,
        isNew: false
      }
    : {
        isNew: true,
        id: "",
        title: "",
        version: "",
        backendUrl: "",
        openApiSpecRef: "",
        authorization: "",
        mediaType: "",
        schemaRef: "",
        policy: []
      };
  editDatasetModal.value = true;
};

const openConfigEditModal = () => {
  configForm.value = {
    ...props.config,
    basePolicy: props.config.basePolicy || {
      type: "default"
    }
  };
  editConfigModal.value = true;
};

const updateConfiguration = async () => {
  editModalLoading.value = true;
  try {
    const config = configForm.value;
    config.baseSemanticModelRef = trimEmptyString(config.baseSemanticModelRef);
    config.authorization = trimEmptyString(config.authorization);
    config.mediaType = trimEmptyString(config.mediaType);
    config.schemaRef = trimEmptyString(config.schemaRef);
    config.openApiSpecRef = trimEmptyString(config.openApiSpecRef);
    config.basePolicy = cleanPolicyConfig(config.basePolicy);
    await http.put("management/config", config);
    editConfigModal.value = false;
    emits("update");
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading dataset config failed",
        defaultMessage: `Could not load dataset config from the HTTP data plane`
      })
    );
  }
  editModalLoading.value = false;
};

const trimEmptyString = (value: string | undefined): string | null => {
  if (!value || !value.trim()) {
    return null;
  }
  return value.trim();
};

const datasetFormSubmit = async () => {
  if (!datasetForm.value) {
    return;
  }
  editModalLoading.value = true;
  const { isNew: isNew, ...dataset } = datasetForm.value;
  dataset.id = trimEmptyString(dataset.id);
  dataset.authorization = trimEmptyString(dataset.authorization);
  dataset.mediaType = trimEmptyString(dataset.mediaType);
  dataset.schemaRef = trimEmptyString(dataset.schemaRef);
  dataset.openApiSpecRef = trimEmptyString(dataset.openApiSpecRef);
  dataset.policy = dataset.policy?.map(cleanPolicyConfig);
  try {
    if (isNew) {
      await http.post("management/datasets", dataset);
    } else {
      await http.put(
        `management/datasets/${encodeURIComponent(dataset.id)}`,
        dataset
      );
    }
    await getDatasets();
    editDatasetModal.value = false;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to save dataset",
        defaultMessage: `Could not save dataset to the HTTP data plane`
      })
    );
  }
  editModalLoading.value = false;
};

const removeDataset = async (datasetId: string) => {
  confirm.require({
    header: "Are you sure you want to delete this dataset?",
    icon: "pi pi-info-circle",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await http.delete(
          `management/datasets/${encodeURIComponent(datasetId)}`
        );
        await getDatasets();
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: "Failed to remove dataset",
            defaultMessage: `Could not remove dataset from the HTTP data plane`
          })
        );
      }
    }
  });
};

const openDatasetDto = (dataset: DatasetItemWithDto) => {
  dialog.open(JSONDialog, {
    props: {
      header: `DCAT Dataset ${dataset.title}`,
      modal: true,
      dismissableMask: true
    },
    data: dataset.dataset
  });
};

onMounted(async () => {
  await getDatasets();
});
</script>

<template>
  <Card>
    <template #title>State</template>
    <template #subtitle>State of this HTTP data plane</template>
    <template #content>
      <div v-if="state" class="grid grid-cols-12 gap-4">
        <div class="col-span-12 min-[1024px]:col-span-8">
          <FormField class="mb-1" :label-width="3" label="Identifier">
            {{ state.identifier }}
          </FormField>
          <FormField class="mb-1" :label-width="3" label="Type">
            {{ state.details.dataplaneType }}
          </FormField>
          <FormField class="mb-1" :label-width="3" label="Synchronization">
            {{ state.details.catalogSynchronization }}
          </FormField>
          <FormField class="mb-1" :label-width="3" label="Role">
            {{ state.details.role }}
          </FormField>
          <FormField
            v-if="config?.baseSemanticModelRef"
            class="mb-1"
            :label-width="3"
            label="Semantic model">
            <div class="truncate">
              <a :href="config?.baseSemanticModelRef" target="_blank">
                {{ config?.baseSemanticModelRef }}
              </a>
            </div>
          </FormField>
          <FormField
            v-if="config?.authorization"
            class="mb-1"
            :label-width="3"
            label="Authorization">
            {{ config?.authorization }}
          </FormField>
          <FormField
            v-if="config?.mediaType"
            class="mb-1"
            :label-width="3"
            label="Media type">
            {{ config?.mediaType }}
          </FormField>
          <FormField
            v-if="config?.schemaRef"
            class="mb-1"
            :label-width="3"
            label="Message schema">
            <div class="truncate">
              <a :href="config?.schemaRef" target="_blank">
                {{ config?.schemaRef }}
              </a>
            </div>
          </FormField>
          <FormField
            v-if="config?.openApiSpecRef"
            class="mb-1"
            :label-width="3"
            label="OpenAPI spec">
            <div class="truncate">
              <a :href="config?.openApiSpecRef" target="_blank">
                {{ config?.openApiSpecRef }}
              </a>
            </div>
          </FormField>
          <FormField
            v-if="config?.basePolicy"
            class="mb-1"
            :label-width="3"
            label="Policy">
            <PolicyView :policy="config.basePolicy" />
          </FormField>
        </div>
        <div class="col-span-12 min-[1024px]:col-span-4">
          <div>
            <Button
              icon="pi pi-refresh"
              severity="info"
              label="Refresh state at Control Plane"
              :loading="refreshLoading"
              @click="refreshRegistration" />
          </div>
          <div class="mt-4">
            <Button
              label="Update configuration"
              :loading="updateLoading"
              severity="warn"
              type="submit"
              @click="openConfigEditModal" />
          </div>
          <div class="mt-4">
            <Button
              label="Add new dataset"
              severity="success"
              type="submit"
              @click="openDatasetEditModal(undefined)" />
          </div>
        </div>
      </div>
    </template>
  </Card>
  <Card v-for="dataset in datasets" :key="dataset.id" class="mt-5">
    <template #title>
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-9 md:col-span-10 lg:col-span-8">
          {{ dataset.title }}
        </div>
        <div class="col-span-3 md:col-span-2 lg:col-span-4">
          <Button
            icon="pi pi-info-circle"
            severity="info"
            @click="openDatasetDto(dataset)" />
          <Button
            class="ml-2"
            icon="pi pi-pencil"
            severity="warn"
            @click="openDatasetEditModal(dataset)" />
          <Button
            class="ml-2"
            icon="pi pi-trash"
            severity="danger"
            @click="removeDataset(dataset.id)" />
        </div>
      </div>
      Dataset {{ dataset.title }}
    </template>
    <template #content>
      <FormField class="mb-1" label="ID">
        <template v-if="dataset.id">{{ dataset.id }}</template>
        <em v-else>Generated</em>
      </FormField>
      <FormField class="mb-1" label="Title">
        {{ dataset.title }}
      </FormField>
      <FormField class="mb-1" label="Version">
        {{ dataset.version }}
      </FormField>
      <FormField class="mb-1" label="Backend URL">
        {{ dataset.backendUrl }}
      </FormField>
      <FormField
        v-if="dataset.openApiSpecRef"
        class="mb-1"
        label="OpenAPI Spec">
        <a
          class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
          :href="dataset.openApiSpecRef"
          target="_blank"
          >{{ dataset.openApiSpecRef }}</a
        >
      </FormField>
      <FormField
        v-if="dataset.authorization"
        class="mb-1"
        label="Authorization">
        {{ dataset.authorization }}
      </FormField>
      <FormField v-if="dataset.mediaType" class="mb-1" label="Media Type">
        {{ dataset.mediaType }}
      </FormField>
      <FormField v-if="dataset.schemaRef" class="mb-1" label="Schema reference">
        <a
          class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
          :href="dataset.schemaRef"
          target="_blank"
          >{{ dataset.schemaRef }}</a
        >
      </FormField>
      <FormField v-if="dataset.policy" class="mb-1" label="Policy">
        <div
          v-if="dataset.policy && dataset.policy.length"
          class="flex flex-col gap-2 divide-y divide-surface-200 dark:divide-surface-700">
          <div
            v-for="(policy, idx) of dataset.policy"
            :key="`${dataset.id}-policy-${idx}`"
            class="pt-2">
            <PolicyView :policy="policy" />
          </div>
        </div>
        <em v-else>Default policy</em>
      </FormField>
    </template>
  </Card>
  <Dialog
    v-model:visible="editConfigModal"
    modal
    :dismissable-mask="true"
    header="Edit configuration"
    :style="{ width: '95vw', maxWidth: '75rem' }">
    <p class="italic pb-4">
      All of the configuration properties are optional and are only in effect if
      these are not provided for datasets
    </p>
    <form class="flex flex-col gap-4" @submit.prevent="updateConfiguration">
      <FormField label="Semantic model">
        <InputText
          v-model="configForm.baseSemanticModelRef"
          class="w-full"
          placeholder="Semantic model reference URL" />
      </FormField>
      <FormField label="Authorization">
        <InputText
          v-model="configForm.authorization"
          class="w-full"
          placeholder="Authorization (HTTP header string, e.g. 'Basic ...', 'Bearer ...')" />
      </FormField>
      <FormField label="Media Type">
        <InputText
          v-model="configForm.mediaType"
          class="w-full"
          placeholder="Media Type (e.g. 'application/json')" />
      </FormField>
      <FormField label="Schema reference">
        <InputText
          v-model="configForm.schemaRef"
          class="w-full"
          placeholder="Message Schema reference URL" />
      </FormField>
      <FormField label="OpenAPI Spec">
        <InputText
          v-model="configForm.openApiSpecRef"
          class="w-full"
          placeholder="OpenAPI Spec URL" />
      </FormField>
      <FormField label="Policy">
        <PolicyEditor v-model="configForm.basePolicy" />
      </FormField>
      <FormField no-label class="mt-8">
        <Button
          label="Update configuration"
          severity="success"
          type="submit"
          :loading="editModalLoading" />
      </FormField>
    </form>
  </Dialog>
  <Dialog
    v-model:visible="editDatasetModal"
    modal
    :dismissable-mask="true"
    :header="datasetForm?.isNew ? 'Add dataset' : 'Edit dataset'"
    :style="{ width: '95vw', maxWidth: '75rem' }">
    <form class="flex flex-col gap-4" @submit.prevent="datasetFormSubmit">
      <FormField label="ID">
        <InputText
          v-model="datasetForm.id"
          class="w-full"
          placeholder="Identifier (leave empty for auto-generated identifier)" />
      </FormField>
      <FormField label="Title*">
        <InputText
          v-model="datasetForm.title"
          required
          class="w-full"
          placeholder="Title" />
      </FormField>
      <FormField label="Version">
        <InputText
          v-model="datasetForm.version"
          required
          class="w-full"
          placeholder="Version" />
      </FormField>
      <FormField label="Backend URL">
        <InputText
          v-model="datasetForm.backendUrl"
          required
          class="w-full"
          placeholder="Backend URL" />
      </FormField>
      <FormField label="OpenAPI Spec">
        <InputText
          v-model="datasetForm.openApiSpecRef"
          class="w-full"
          placeholder="OpenAPI Spec URL" />
      </FormField>
      <FormField label="Authorization">
        <InputText
          v-model="datasetForm.authorization"
          class="w-full"
          placeholder="Authorization (HTTP header string, e.g. 'Basic ...', 'Bearer ...')" />
      </FormField>
      <FormField label="Media Type">
        <InputText
          v-model="datasetForm.mediaType"
          class="w-full"
          placeholder="Media Type (e.g. 'application/json')" />
      </FormField>
      <FormField label="Schema reference">
        <InputText
          v-model="datasetForm.schemaRef"
          class="w-full"
          placeholder="Message Schema reference URL" />
      </FormField>
      <FormField label="Policy">
        <div
          v-if="datasetForm.policy"
          class="flex flex-col gap-2 divide-y divide-surface-200 dark:divide-surface-700">
          <div
            v-for="(_, idx) in datasetForm.policy"
            :key="`modal-policy-${idx}`"
            class="pt-2">
            <PolicyEditor v-model="datasetForm.policy[idx]" />
            <Button
              icon="pi pi-minus"
              severity="danger"
              label="Remove policy"
              @click="datasetForm.policy.splice(idx, 1)" />
          </div>
        </div>
        <Button
          icon="pi pi-plus"
          label="Add policy"
          @click="pushOrCreate(datasetForm, 'policy', { type: 'default' })" />
      </FormField>

      <FormField v-if="datasetForm.isNew" no-label class="mt-8">
        <Button
          label="Add dataset"
          severity="success"
          type="submit"
          :loading="editModalLoading" />
      </FormField>
      <FormField v-else no-label class="mt-8">
        <Button
          label="Update dataset"
          severity="success"
          type="submit"
          :loading="editModalLoading" />
      </FormField>
    </form>
  </Dialog>
</template>
