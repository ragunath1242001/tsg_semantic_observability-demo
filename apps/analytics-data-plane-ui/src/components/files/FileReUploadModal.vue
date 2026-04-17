<script setup lang="ts">
import type { FileMetadataDto } from "@tsg-dsp/analytics-data-plane-dtos";
import {
  FileUploadSelectEvent,
  FileUploadUploadEvent,
  useToast
} from "primevue";
import type { DynamicDialogInstance } from "primevue/dynamicdialogoptions";
import { computed, inject, onMounted, type Ref, ref } from "vue";

import { mimeToUrl } from "../../utils/mime";

const toast = useToast();
const dialogRef = inject<Ref<DynamicDialogInstance>>("dialogRef");
const file = ref<FileMetadataDto>();

const uploadUrl = computed(() => `api/files/${file.value?.id}/upload`);

const onSelectedFile = (event: FileUploadSelectEvent) => {
  event.files.forEach((file) => {
    if (!file.objectURL) {
      file.objectURL = mimeToUrl(file.type);
    }
  });
};

const onAdvancedUpload = (event: FileUploadUploadEvent) => {
  console.log(event);
  toast.add({
    severity: "success",
    summary: "Success",
    detail: "File re-uploaded successfully",
    life: 3000
  });
  dialogRef?.value.close();
};

onMounted(() => {
  if (!dialogRef) {
    throw new Error("Dialog reference is not provided");
  }
  file.value = dialogRef.value.data.file;
});
</script>

<template>
  <div>
    <FileUpload
      v-if="file"
      name="file"
      :url="uploadUrl"
      :multiple="false"
      :file-limit="1"
      :max-file-size="1024 * 1024 * 1024"
      :pt="{
        root: {
          style: 'border-width: 0'
        },
        header: {
          style: 'background: transparent'
        }
      }"
      @select="onSelectedFile"
      @upload="onAdvancedUpload($event)">
      <template #empty>
        <span>Drag and drop files to here to upload.</span>
      </template>
    </FileUpload>
  </div>
</template>
