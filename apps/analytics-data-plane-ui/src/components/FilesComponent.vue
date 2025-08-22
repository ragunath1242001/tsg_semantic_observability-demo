<script setup lang="ts">
import { CSVW, FileMetadataDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { DatasetDto } from "@tsg-dsp/common-dsp";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useDialog } from "primevue";
import { usePrimeVue } from "primevue/config";
import { SelectChangeEvent } from "primevue/select";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

import FileDetailModal from "./files/FileDetailModal.vue";
import FileEditModal from "./files/FileEditModal.vue";
import FileReUploadModal from "./files/FileReUploadModal.vue";

const $primevue = usePrimeVue();

const filesList = ref<FileMetadataDto[]>([]);
const layout = ref<"list" | "grid">("grid");
const layoutOptions = ref([
  { label: "List", value: "list", icon: "pi pi-bars" },
  { label: "Grid", value: "grid", icon: "pi pi-table" }
]);
const sortKey = ref();
const sortOrder = ref<number>();
const sortField = ref<string>();
const sortOptions = ref([
  { label: "Name A-Z", value: "originalFileName", order: 1 },
  { label: "Name Z-A", value: "originalFileName", order: -1 },
  { label: "Size Low to High", value: "fileSizeInBytes", order: 1 },
  { label: "Size High to Low", value: "fileSizeInBytes", order: -1 },
  { label: "Type A-Z", value: "mediaType", order: 1 },
  { label: "Type Z-A", value: "mediaType", order: -1 }
]);

const toast = useToast();
const confirm = useConfirm();
const dialog = useDialog();

// Filter states
const globalFilterValue = ref("");
const filters = ref({
  global: { value: null, matchMode: "contains" },
  presentInLastCheck: { value: null, matchMode: "equals" },
  hasDataset: { value: null, matchMode: "equals" },
  hasCSVW: { value: null, matchMode: "equals" }
});

// Computed properties
const filteredFiles = computed(() => {
  let filtered = [...filesList.value];

  // Global filter
  if (globalFilterValue.value) {
    filtered = filtered.filter(
      (file) =>
        file.originalFileName
          .toLowerCase()
          .includes(globalFilterValue.value.toLowerCase()) ||
        file.mediaType
          .toLowerCase()
          .includes(globalFilterValue.value.toLowerCase())
    );
  }

  // Specific filters
  if (filters.value.presentInLastCheck.value !== null) {
    filtered = filtered.filter(
      (file) =>
        file.presentInLastCheck === filters.value.presentInLastCheck.value
    );
  }

  if (filters.value.hasDataset.value !== null) {
    const hasDataset = filters.value.hasDataset.value;
    filtered = filtered.filter((file) =>
      hasDataset ? !!file.datasetId : !file.datasetId
    );
  }

  if (filters.value.hasCSVW.value !== null) {
    const hasCSVW = filters.value.hasCSVW.value;
    filtered = filtered.filter((file) => (hasCSVW ? !!file.csvw : !file.csvw));
  }

  return filtered;
});

const getFiles = async () => {
  try {
    const response = await http.get<FileMetadataDto[]>("files");
    filesList.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading state failed",
        defaultMessage: "Could not load state from the analytics data plane"
      })
    );
  }
};

const removeFile = async (fileId: string) => {
  confirm.require({
    header: "Are you sure you want to delete this file?",
    message:
      "This will remove any reference, created dataset, and the file itself.",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    acceptClass: "p-button-danger",
    rejectClass: "p-button-secondary p-button-outlined",
    accept: async () => {
      try {
        filesList.value = filesList.value.filter(
          (file) => file.identifier !== fileId
        );
        await http.delete(`files/${fileId}`);
        toast.add({
          severity: "success",
          summary: "File deleted",
          detail: "The file has been deleted successfully.",
          life: 5000
        });
        await getFiles();
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: "File deletion failed",
            defaultMessage:
              "Could not delete the file from the analytics data plane"
          })
        );
      }
    },
    reject: () => {
      toast.add({
        severity: "info",
        summary: "File deletion cancelled",
        detail: "The file was not deleted.",
        life: 10000
      });
    }
  });
};

const onSortChange = (event: SelectChangeEvent) => {
  const sortValue = event.value;

  sortOrder.value = sortValue.order;
  sortField.value = sortValue.value;
  sortKey.value = sortValue;
};

const clearFilters = () => {
  globalFilterValue.value = "";
  filters.value.presentInLastCheck.value = null;
  filters.value.hasDataset.value = null;
  filters.value.hasCSVW.value = null;
};

const formatSize = (bytes: number) => {
  // duplicate because usePrimevue() doesn't work in utils
  const k = 1024;
  const dm = 1;
  const sizes = $primevue.config.locale.fileSizeTypes;

  if (bytes === 0) {
    return `0 ${sizes[0]}`;
  }

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${formattedSize} ${sizes[i]}`;
};

const getStatusSeverity = (file: FileMetadataDto) => {
  if (!file.presentInLastCheck) return "danger";
  if (!file.datasetId) return "warn";
  return "success";
};

const getFileIcon = (mediaType: string) => {
  if (mediaType.includes("csv")) return "pi pi-file-excel";
  if (mediaType.includes("json")) return "pi pi-code";
  if (mediaType.includes("image")) return "pi pi-image";
  if (mediaType.includes("pdf")) return "pi pi-file-pdf";
  if (mediaType.includes("text")) return "pi pi-file-edit";
  return "pi pi-file";
};

const getFileStatusText = (file: FileMetadataDto) => {
  if (!file.presentInLastCheck) return "Missing from disk";
  if (!file.datasetId) return "No dataset linked";
  return "Ready";
};
const showDatasetDetails = async (fileId: string, title: string) => {
  try {
    const response = await http.get<DatasetDto>(`files/${fileId}/dataset`);
    dialog.open(FileDetailModal, {
      props: {
        header: `Dataset Details - ${title}`,
        pt: {
          header: "cursor-move"
        },
        modal: false
      },
      data: {
        dcat: response.data,
        fileId: fileId
      },
      onClose(options) {
        if (options.data?.reload) {
          getFiles();
        }
      }
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Dataset loading failed",
        defaultMessage: "Could not load dataset details"
      })
    );
    return null;
  }
};

const showCSVWDetails = async (fileId: string, csvw: CSVW, title: string) => {
  dialog.open(FileDetailModal, {
    props: {
      header: `CSVW Details - ${title}`,
      pt: {
        header: "cursor-move"
      },
      modal: false
    },
    data: {
      csvw: csvw,
      fileId: fileId
    },
    onClose(options) {
      if (options.data?.reload) {
        getFiles();
      }
    }
  });
};

const previewFile = async (fileId: string, title: string) => {
  try {
    const response = await http.get<Blob>(`files/${fileId}/preview`, {
      params: { previewSize: 102400 },
      responseType: "blob"
    });
    dialog.open(FileDetailModal, {
      props: {
        header: `File preview - ${title}`,
        pt: {
          header: "cursor-move"
        },
        modal: false
      },
      data: {
        preview: await response.data.text(),
        fileId: fileId
      }
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "File preview failed",
        defaultMessage: "Could not preview the file"
      })
    );
  }
};

const downloadFile = async (fileId: string, filename: string) => {
  try {
    const response = await http.get<Blob>(`files/${fileId}/preview`, {
      responseType: "blob"
    });

    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "File preview failed",
        defaultMessage: "Could not preview the file"
      })
    );
  }
};

const editFile = (file: FileMetadataDto) => {
  dialog.open(FileEditModal, {
    props: {
      header: `Edit File - ${file.originalFileName}`,
      pt: {
        root: {
          class: "w-5xl max-w-[90vw]"
        },
        header: "cursor-move"
      },
      modal: true
    },
    data: {
      file: file
    },
    onClose: () => getFiles()
  });
};

const reUploadFile = (file: FileMetadataDto) => {
  dialog.open(FileReUploadModal, {
    props: {
      header: `Re-upload File - ${file.originalFileName}`,
      pt: {
        root: {
          class: "w-5xl max-w-[90vw]"
        },
        header: "cursor-move"
      },
      modal: true
    },
    data: {
      file: file
    },
    onClose: () => getFiles()
  });
};

defineExpose({
  getFiles
});

onMounted(async () => {
  await getFiles();
});
</script>
<template>
  <div class="files-component">
    <!-- Header Section -->
    <div class="mb-6">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-surface-600 dark:text-surface-400">
            Manage your uploaded files and their metadata
          </p>
        </div>

        <!-- Global Search -->
        <div class="flex gap-2">
          <IconField icon-position="left">
            <InputIcon>
              <i class="pi pi-search" />
            </InputIcon>
            <InputText
              v-model="globalFilterValue"
              placeholder="Search files..."
              class="w-64" />
          </IconField>
          <Button
            v-tooltip.bottom="'Clear all filters'"
            icon="pi pi-filter-slash"
            label="Clear"
            outlined
            @click="clearFilters" />
          <Button
            v-tooltip.bottom="'Refresh files list'"
            icon="pi pi-refresh"
            label="Refresh"
            outlined
            @click="getFiles" />
        </div>
      </div>
    </div>

    <!-- DataView -->
    <DataView
      :value="filteredFiles"
      :layout="layout"
      :paginator="filteredFiles.length > 12"
      :rows="layout === 'list' ? 9 : 9"
      :sort-order="sortOrder"
      :sort-field="sortField"
      :pt="{
        root: {
          style: 'border-width: 0'
        },
        header: {
          style: 'background: transparent'
        }
      }">
      <!-- Header -->
      <template #header>
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <!-- Sort Options -->
          <div class="flex gap-2">
            <Select
              v-model="sortKey"
              :options="sortOptions"
              option-label="label"
              placeholder="Sort by..."
              class="w-48"
              @change="onSortChange" />
          </div>

          <!-- Filters -->
          <div class="flex flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium">Status:</label>
              <Select
                v-model="filters.presentInLastCheck.value"
                :options="[
                  { label: 'All', value: null },
                  { label: 'Available', value: true },
                  { label: 'Missing', value: false }
                ]"
                option-label="label"
                option-value="value"
                placeholder="All"
                class="w-32" />
            </div>

            <div class="flex items-center gap-2">
              <label class="text-sm font-medium">Dataset:</label>
              <Select
                v-model="filters.hasDataset.value"
                :options="[
                  { label: 'All', value: null },
                  { label: 'Linked', value: true },
                  { label: 'Unlinked', value: false }
                ]"
                option-label="label"
                option-value="value"
                placeholder="All"
                class="w-32" />
            </div>

            <div class="flex items-center gap-2">
              <label class="text-sm font-medium">CSVW:</label>
              <Select
                v-model="filters.hasCSVW.value"
                :options="[
                  { label: 'All', value: null },
                  { label: 'With CSVW', value: true },
                  { label: 'Without CSVW', value: false }
                ]"
                option-label="label"
                option-value="value"
                placeholder="All"
                class="w-32" />
            </div>
          </div>

          <!-- Layout Toggle -->
          <SelectButton
            v-model="layout"
            :options="layoutOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false">
            <template #option="slotProps">
              <i :class="slotProps.option.icon" />
            </template>
          </SelectButton>
        </div>
      </template>

      <!-- List Layout -->
      <template #list="slotProps">
        <div class="flex flex-col">
          <div
            v-for="(file, index) in slotProps.items"
            :key="file.identifier"
            class="flex flex-col sm:flex-row sm:items-center p-2 gap-6 border-surface-200 dark:border-surface-700"
            :class="{
              'border-t ': index !== 0,
              'opacity-60': !file.presentInLastCheck
            }">
            <!-- File Icon -->
            <div
              class="flex items-center justify-center w-16 h-16 rounded-lg bg-surface-100 dark:bg-surface-800">
              <i
                :class="getFileIcon(file.mediaType)"
                class="text-2xl! text-surface-600 dark:text-surface-400" />
            </div>

            <!-- File Info -->
            <div
              class="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-1 gap-4">
              <div class="flex flex-col gap-2">
                <div>
                  <div
                    class="text-lg font-semibold text-surface-900 dark:text-surface-0">
                    {{ file.originalFileName }}
                  </div>
                  <div class="text-sm text-surface-600 dark:text-surface-400">
                    {{ file.mediaType }}
                  </div>
                </div>

                <div class="flex flex-wrap gap-2 items-center">
                  <Tag
                    :value="getFileStatusText(file)"
                    :severity="getStatusSeverity(file)"
                    size="small" />
                  <span class="text-sm text-surface-600 dark:text-surface-400">
                    {{ formatSize(file.fileSizeInBytes) }}
                  </span>
                  <Button
                    v-if="file.csvw"
                    :pt:root:class="'p-0.5! text-xs!'"
                    label="Has CSVW"
                    severity="info"
                    size="small"
                    @click="
                      showCSVWDetails(
                        file.identifier,
                        file.csvw,
                        file.originalFileName
                      )
                    " />
                  <Button
                    v-if="file.datasetId"
                    :pt:root:class="'p-0.5! text-xs!'"
                    label="Dataset Linked"
                    severity="success"
                    size="small"
                    @click="
                      showDatasetDetails(file.identifier, file.originalFileName)
                    " />
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-2">
                <Button
                  v-tooltip.bottom="'Preview file'"
                  icon="pi pi-eye"
                  severity="info"
                  size="small"
                  rounded
                  outlined
                  @click.capture="
                    previewFile(file.identifier, file.originalFileName)
                  " />
                <Button
                  v-tooltip.bottom="'Download file'"
                  class="mr-5"
                  icon="pi pi-download"
                  severity="success"
                  size="small"
                  rounded
                  outlined
                  @click.capture="
                    downloadFile(file.identifier, file.originalFileName)
                  " />
                <Button
                  v-tooltip.bottom="'Re-upload file'"
                  icon="pi pi-upload"
                  severity="info"
                  size="small"
                  rounded
                  outlined
                  @click.capture="reUploadFile(file)" />
                <Button
                  v-tooltip.bottom="'Edit file metadata'"
                  icon="pi pi-pencil"
                  severity="warn"
                  size="small"
                  rounded
                  outlined
                  @click.capture="editFile(file)" />
                <Button
                  v-tooltip.bottom="'Delete file'"
                  icon="pi pi-trash"
                  severity="danger"
                  size="small"
                  rounded
                  outlined
                  @click.capture="removeFile(file.identifier)" />
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Grid Layout -->
      <template #grid="slotProps">
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-5">
          <div
            v-for="file in slotProps.items"
            :key="file.identifier"
            class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            :class="{ 'opacity-60': !file.presentInLastCheck }">
            <!-- Card Header -->
            <div class="relative p-4 bg-surface-50 dark:bg-surface-800">
              <div class="absolute top-2 left-2 flex gap-2">
                <Button
                  v-tooltip.bottom="'Preview file'"
                  icon="pi pi-eye"
                  severity="info"
                  size="small"
                  rounded
                  outlined
                  @click.capture="
                    previewFile(file.identifier, file.originalFileName)
                  " />
                <Button
                  v-tooltip.bottom="'Download file'"
                  icon="pi pi-download"
                  severity="success"
                  size="small"
                  rounded
                  outlined
                  @click.capture="
                    downloadFile(file.identifier, file.originalFileName)
                  " />
              </div>
              <div class="absolute top-2 right-2 flex gap-2">
                <Button
                  v-tooltip.bottom="'Re-upload file'"
                  icon="pi pi-upload"
                  severity="info"
                  size="small"
                  rounded
                  outlined
                  @click.capture="reUploadFile(file)" />
                <Button
                  v-tooltip.bottom="'Edit file metadata'"
                  icon="pi pi-pencil"
                  severity="warn"
                  size="small"
                  rounded
                  outlined
                  @click.capture="editFile(file)" />
                <Button
                  v-tooltip.bottom="'Delete file'"
                  icon="pi pi-trash"
                  severity="danger"
                  size="small"
                  rounded
                  outlined
                  @click.capture="removeFile(file.identifier)" />
              </div>

              <div class="flex flex-col items-center text-center">
                <div
                  class="w-16 h-16 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center mb-3">
                  <i
                    :class="getFileIcon(file.mediaType)"
                    class="text-3xl! text-surface-600 dark:text-surface-400" />
                </div>
                <div
                  class="text-lg font-semibold text-surface-900 dark:text-surface-0 truncate w-full">
                  {{ file.originalFileName }}
                </div>
                <div
                  class="text-sm text-surface-600 dark:text-surface-400 truncate w-full">
                  {{ file.mediaType }}
                </div>
              </div>
            </div>

            <!-- Card Content -->
            <div class="p-4">
              <div class="flex flex-col gap-3">
                <!-- Status and Size -->
                <div class="flex items-center justify-between">
                  <Tag
                    :value="getFileStatusText(file)"
                    :severity="getStatusSeverity(file)"
                    size="small" />
                  <span
                    class="text-sm font-medium text-surface-700 dark:text-surface-300">
                    {{ formatSize(file.fileSizeInBytes) }}
                  </span>
                </div>

                <!-- Badges -->
                <div class="flex flex-wrap gap-2">
                  <Button
                    v-if="file.csvw"
                    :pt:root:class="'p-0.5! text-xs!'"
                    label="Has CSVW"
                    severity="info"
                    size="small"
                    @click="
                      showCSVWDetails(
                        file.identifier,
                        file.csvw,
                        file.originalFileName
                      )
                    " />
                  <Button
                    v-if="file.datasetId"
                    :pt:root:class="'p-0.5! text-xs!'"
                    label="Dataset Linked"
                    severity="success"
                    size="small"
                    @click="
                      showDatasetDetails(file.identifier, file.originalFileName)
                    " />
                </div>

                <!-- Warning Icons -->
                <div
                  v-if="!file.presentInLastCheck || !file.datasetId"
                  class="flex gap-2">
                  <div
                    v-if="!file.presentInLastCheck"
                    class="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <i class="pi pi-exclamation-triangle text-sm" />
                    <span class="text-xs">Not found on disk</span>
                  </div>
                  <div
                    v-if="!file.datasetId"
                    class="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                    <i class="pi pi-info-circle text-sm" />
                    <span class="text-xs">No dataset linked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <template #empty>
        <div
          class="flex flex-col items-center justify-center py-16 text-center">
          <i
            class="pi pi-file text-6xl text-surface-400 dark:text-surface-600 mb-4" />
          <h3
            class="text-xl font-semibold text-surface-700 dark:text-surface-300 mb-2">
            No files found
          </h3>
          <p class="text-surface-600 dark:text-surface-400 max-w-md">
            Upload files to start using the analytics data plane or adjust your
            filters to see more results.
          </p>
        </div>
      </template>
    </DataView>
  </div>
</template>
<style scoped>
.files-component {
  width: 100%;
}

/* Ensure consistent card heights in grid layout */
.files-component :deep(.p-dataview-grid .p-dataview-content) {
  height: 100%;
}

/* Better spacing for filter controls */
.files-component :deep(.p-select) {
  min-width: 0;
}

/* Enhanced card hover effects */
.files-component :deep(.p-card:hover) {
  transform: scale(1.02);
  transition: transform 0.2s;
}

/* Better status indicators */
.files-component :deep(.p-tag) {
  font-weight: 500;
}

/* Improved empty state */
.files-component :deep(.p-dataview-empty) {
  background: var(--surface-50);
  border-radius: 0.5rem;
}

.dark .files-component :deep(.p-dataview-empty) {
  background: var(--surface-900);
}
</style>
