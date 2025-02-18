<script setup lang="ts">
import { ref } from "vue";
import { usePrimeVue } from "primevue/config";
import { useToast } from "primevue/usetoast";
import http from "@tsg-dsp/common-ui/utils/http.js";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

const $primevue = usePrimeVue();
const toast = useToast();

const totalSize = ref(0);
const totalSizePercent = ref(0);
const files = ref([]);

const onRemoveTemplatingFile = (file, removeFileCallback, index) => {
  removeFileCallback(index);
  totalSize.value -= parseInt(formatSize(file.size));
  totalSizePercent.value = totalSize.value / 10;
};

const onSelectedFiles = (event) => {
  files.value = event.files;
  files.value.forEach((file) => {
    totalSize.value += parseInt(formatSize(file.size));
  });
};

const uploadEvent = (callback) => {
  totalSizePercent.value = totalSize.value / 10;
  callback();
};

const formatSize = (bytes) => {
  const k = 1024;
  const dm = 3;
  const sizes = $primevue.config.locale.fileSizeTypes;

  if (bytes === 0) {
    return `0 ${sizes[0]}`;
  }

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${formattedSize} ${sizes[i]}`;
};

const handleUpload = async (event) => {
  try {
    const files = event.files;
    const resp = await http.post(
      "files/upload",
      { files: files },
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );
    if (resp.status == 201) {
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "File Uploaded",
        life: 3000
      });
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to upload file",
        defaultMessage: "Could not upload file"
      })
    );
    console.error("Error:", error);
    throw error;
  }
};
</script>

<template>
  <div class="card">
    <Toast />
    <FileUpload
      name="files[]"
      custom-upload
      :multiple="true"
      @uploader="handleUpload"
      @select="onSelectedFiles">
      <template
        #header="{ chooseCallback, uploadCallback, clearCallback, files }">
        <div class="flex flex-wrap justify-between items-center flex-1 gap-4">
          <div class="flex gap-2">
            <Button
              icon="pi pi-folder"
              rounded
              outlined
              severity="secondary"
              @click="chooseCallback()"></Button>
            <Button
              icon="pi pi-cloud-upload"
              rounded
              outlined
              severity="success"
              :disabled="!files || files.length === 0"
              @click="uploadEvent(uploadCallback)"></Button>
            <Button
              icon="pi pi-times"
              rounded
              outlined
              severity="danger"
              :disabled="!files || files.length === 0"
              @click="clearCallback()"></Button>
          </div>
          <ProgressBar
            :value="totalSizePercent"
            :show-value="false"
            class="md:w-20rem h-1 w-full md:ml-auto">
            <span class="whitespace-nowrap">{{ totalSize }}B / 1Mb</span>
          </ProgressBar>
        </div>
      </template>
      <template
        #content="{
          files,
          uploadedFiles,
          removeUploadedFileCallback,
          removeFileCallback
        }">
        <div class="flex flex-col gap-8 pt-4">
          <div v-if="files.length > 0">
            <h5>Pending</h5>
            <div class="flex flex-wrap gap-4">
              <div
                v-for="(file, index) of files"
                :key="file.name + file.type + file.size"
                class="p-8 rounded-border flex flex-col border border-surface items-center gap-4">
                <div>
                  <i class="pi pi-file" style="font-size: 2.5rem" />
                </div>
                <span
                  class="font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden"
                  >{{ file.name }}</span
                >
                <div>{{ formatSize(file.size) }}</div>
                <Badge value="Pending" severity="warn" />
                <Button
                  icon="pi pi-times"
                  outlined
                  rounded
                  severity="danger"
                  @click="
                    onRemoveTemplatingFile(file, removeFileCallback, index)
                  " />
              </div>
            </div>
          </div>

          <div v-if="uploadedFiles.length > 0">
            <h5>Completed</h5>
            <div class="flex flex-wrap gap-4">
              <div
                v-for="(file, index) of uploadedFiles"
                :key="file.name + file.type + file.size"
                class="p-8 rounded-border flex flex-col border border-surface items-center gap-4">
                <div>
                  <i class="pi pi-file" style="font-size: 2.5rem" />
                </div>
                <span
                  class="font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden"
                  >{{ file.name }}</span
                >
                <div>{{ formatSize(file.size) }}</div>
                <Badge value="Completed" class="mt-4" severity="success" />
                <Button
                  icon="pi pi-times"
                  outlined
                  rounded
                  severity="danger"
                  @click="removeUploadedFileCallback(index)" />
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #empty>
        <div class="flex items-center justify-center flex-col">
          <i
            class="pi pi-cloud-upload !border-2 !rounded-full !p-8 !text-4xl !text-muted-color" />
          <p class="mt-6 mb-0">Drag and drop files to here to upload.</p>
        </div>
      </template>
    </FileUpload>
  </div>
</template>
