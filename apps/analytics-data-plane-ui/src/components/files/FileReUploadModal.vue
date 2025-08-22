<script setup lang="ts">
import {
  FileUploadSelectEvent,
  FileUploadUploadEvent,
  useToast
} from "primevue";
import { DynamicDialogInstance } from "primevue/dynamicdialogoptions";
import { inject, Ref } from "vue";

import { mimeToUrl } from "../../utils/mime";

const toast = useToast();
const dialogRef = inject<Ref<DynamicDialogInstance>>("dialogRef");

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
    detail: "Files Uploaded",
    life: 3000
  });
  dialogRef.value.close();
};
</script>

<template>
  <div>
    <FileUpload
      name="file"
      url="api/files/upload"
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
