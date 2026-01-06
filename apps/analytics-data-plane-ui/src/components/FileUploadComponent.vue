<script setup lang="ts">
import {
  FileUpload,
  FileUploadSelectEvent,
  FileUploadUploadEvent
} from "primevue";
import { useToast } from "primevue/usetoast";
import { useTemplateRef } from "vue";

import { mimeToUrl } from "../utils/mime";

const toast = useToast();
const emit = defineEmits(["uploaded"]);

const fileUploadRef = useTemplateRef("fileUploadRef");

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
    summary: "Files Uploaded",
    detail:
      "Your files have been uploaded. Metadata is being generated in the background.",
    life: 5000
  });
  emit("uploaded", event.files);
  (fileUploadRef.value as any)?.clear();
};
</script>

<template>
  <div>
    <FileUpload
      ref="fileUploadRef"
      name="files[]"
      url="api/files/upload"
      :multiple="true"
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
