<script setup lang="ts">
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { usePrimeVue } from "primevue/config";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";

const $primevue = usePrimeVue();

const filesList = ref(null);

const toast = useToast();

const getFiles = async () => {
  try {
    const response = await http.get("files");
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
const formatSize = (bytes) => {
  // duplicate because usePrimevue() doesn't work in utils
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

const calculateClass = (filePresent: boolean): string => {
  return filePresent ? "flex flex-col h-full" : "flex flex-col h-full disabled";
};

onMounted(async () => {
  await getFiles();
});
</script>
<template>
  <div
    v-if="filesList?.length > 0"
    class="grid grid-cols-12 gap-8 card-container mb-4">
    <div
      v-for="file in filesList"
      :key="file"
      class="col-span-12 lg:col-span-6 xl:col-span-3">
      <Card
        :class="calculateClass(file.presentInLastCheck)"
        style="border-radius: 12px; border: 1px solid var(--surface-border)">
        <template #content>
          <div v-if="!file.presentInLastCheck" class="relative">
            <div class="absolute top-2 right-2">
              <Button
                v-tooltip.bottom="
                  'This file was not found on your disk, so it is not advertised in your Catalogue.'
                "
                icon="pi pi-info"
                severity="danger"
                rounded
                outlined />
            </div>
          </div>
          <div class="flex items-center justify-center flex-col">
            <i
              class="pi pi-file !border-2 !rounded-full !p-8 !text-4xl !text-muted-color"></i>
            <span
              class="mt-3 font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden"
              >{{ file.fileName }}</span
            >
            <div class="mt-3">{{ formatSize(file.fileSizeInBytes) }}</div>
          </div>
        </template>
      </Card>
    </div>
  </div>
  <div v-else class="col-span-12">
    <Card>
      <template #title>No files found</template>
      <template #content>
        <p>No files were found on the system.</p>
      </template>
    </Card>
  </div>
</template>
<style>
.disabled {
  opacity: var(--p-disabled-opacity);
}
</style>
