<script setup lang="ts">
import { FileUploadSelectEvent, FileUploadUploadEvent } from "primevue";
import { useToast } from "primevue/usetoast";

import { mimeToUrl } from "../utils/mime";

const toast = useToast();
const emit = defineEmits(["uploaded"]);

const onSelectedFile = (event: FileUploadSelectEvent) => {
  event.files.forEach((file) => {
    console.log("Selected file:", file);
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
  emit("uploaded", event.files);
};
</script>

<template>
  <div>
    <FileUpload
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
