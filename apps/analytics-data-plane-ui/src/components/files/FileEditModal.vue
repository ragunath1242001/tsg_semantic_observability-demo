<script setup lang="ts">
import {
  FileMetadataDto,
  FileUpdateDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import MonacoEditor from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { InputText, useToast } from "primevue";
import type { DynamicDialogInstance } from "primevue/dynamicdialogoptions";
import { inject, onMounted, Ref, ref } from "vue";

const toast = useToast();
const dialogRef = inject<Ref<DynamicDialogInstance>>("dialogRef");

const data = ref<FileMetadataDto>();
const formData = ref<FileUpdateDto>({
  originalFileName: undefined,
  mediaType: undefined,
  csvw: undefined
});

const csvwString = ref<string>("");

const save = async () => {
  if (!dialogRef) {
    throw new Error("Dialog reference is not provided");
  }
  if (data.value.mediaType === "text/csv") {
    try {
      data.value.csvw = JSON.parse(csvwString.value);
    } catch (_error) {
      toast.add({
        severity: "error",
        summary: "Invalid CSVW",
        detail: "CSVW JSON is invalid",
        life: 5000
      });
      return;
    }
  } else {
    data.value.csvw = undefined;
  }
  try {
    await http.post(`files/${data.value.id}`, formData.value);
    toast.add({
      severity: "success",
      summary: "File updated",
      detail: "The file has been updated successfully.",
      life: 5000
    });
    dialogRef.value.close();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "File update failed",
        defaultMessage: "Could not update the file"
      })
    );
  }
};

onMounted(() => {
  if (!dialogRef) {
    throw new Error("Dialog reference is not provided");
  }
  data.value = dialogRef.value.data.file;
  formData.value.originalFileName = data.value.originalFileName;
  formData.value.mediaType = data.value.mediaType;
  if (data.value.csvw) {
    formData.value.csvw = data.value.csvw;
    csvwString.value = JSON.stringify(data.value.csvw, null, 2);
  } else {
    csvwString.value = "";
  }
});
</script>

<template>
  <div>
    <form @submit.prevent="save">
      <div class="flex flex-col gap-4">
        <FormField label="File Name">
          <InputText v-model="formData.originalFileName" class="w-full" />
        </FormField>
        <FormField label="Media Type">
          <InputText v-model="formData.mediaType" class="w-full" />
        </FormField>
        <FormField v-if="formData.mediaType === 'text/csv'" label="CSVW">
          <MonacoEditor v-model="csvwString" />
        </FormField>
        <FormField :label-width="3">
          <div class="flex flex-row gap-5">
            <Button type="submit" severity="info">Save</Button>
            <Button
              type="button"
              severity="secondary"
              @click="dialogRef.close()"
              >Cancel</Button
            >
          </div>
        </FormField>
      </div>
    </form>
  </div>
</template>
