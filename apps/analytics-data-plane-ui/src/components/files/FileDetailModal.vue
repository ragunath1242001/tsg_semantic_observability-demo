<script setup lang="ts">
import { Dataset, deserialize } from "@tsg-dsp/common-dsp";
import MonacoEditor from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useToast } from "primevue";
import { DynamicDialogInstance } from "primevue/dynamicdialogoptions";
import { inject, onMounted, Ref, ref } from "vue";

const dialogRef = inject<Ref<DynamicDialogInstance>>("dialogRef");
const toast = useToast();

const data = ref();
const fileId = ref();

const edit = ref(false);
const loading = ref(false);
const type = ref<"csvw" | "dcat" | "preview">();

const save = async () => {
  loading.value = true;
  try {
    if (type.value === "dcat") {
      const parsed = JSON.parse(data.value);
      await deserialize<Dataset>(parsed);
      await http.put("management/dataset", parsed, {
        params: {
          datasetId: dialogRef.value.data.dcat["@id"]
        }
      });
      toast.add({
        severity: "success",
        summary: "File metadata updated",
        detail: "The file metadata has been updated successfully.",
        life: 5000
      });
      dialogRef.value.close({ reload: true });
    } else if (type.value === "csvw") {
      const csvw = JSON.parse(data.value);
      await http.post(`files/${fileId.value}`, {
        csvw: csvw
      });
      toast.add({
        severity: "success",
        summary: "CSVW metadata updated",
        detail: "The CSVW file metadata has been updated successfully.",
        life: 5000
      });
      dialogRef.value.close({ reload: true });
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Update failed",
        defaultMessage: "Could not update the metadata"
      })
    );
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (!dialogRef) {
    throw new Error("Dialog reference is not provided");
  }
  fileId.value = dialogRef.value.data.fileId;
  if (dialogRef.value.data.csvw) {
    data.value = JSON.stringify(dialogRef.value.data.csvw, null, 2);
    type.value = "csvw";
  } else if (dialogRef.value.data.dcat) {
    data.value = JSON.stringify(dialogRef.value.data.dcat, null, 2);
    type.value = "dcat";
  } else if (dialogRef.value.data.preview) {
    data.value = dialogRef.value.data.preview;
    type.value = "preview";
  } else {
    throw new Error("No valid data provided for CSVW, DCAT, or preview");
  }
});
</script>

<template>
  <div
    class="relative resize-x overflow-auto min-w-[600px] max-w-[80vw] height-[100%]">
    <MonacoEditor
      v-if="data"
      v-model="data"
      :max-lines="30"
      :min-lines="20"
      :read-only="!edit" />
  </div>
  <div
    v-if="type === 'dcat' || type === 'csvw'"
    class="absolute top-7 right-20 flex gap-2">
    <Button
      v-if="edit"
      icon="pi pi-save"
      severity="info"
      size="small"
      :loading="loading"
      rounded
      @click="save" />
    <Button
      v-if="edit"
      icon="pi pi-times"
      severity="danger"
      size="small"
      :disabled="loading"
      rounded
      @click="edit = !edit" />
    <Button
      v-if="!edit"
      icon="pi pi-pencil"
      severity="warn"
      size="small"
      rounded
      outlined
      @click="edit = true" />
  </div>
</template>
