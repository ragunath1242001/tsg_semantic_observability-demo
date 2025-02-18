<script setup lang="ts">
import http from "../utils/http";
import { useToast } from "primevue/usetoast";
import { toastError } from "../utils/error";
import { updateColorPalette } from "../utils/color";
import FormField from "../components/FormField.vue";
import { ref, toRefs } from "vue";

const toast = useToast();

interface BaseRuntime {
  runtimeStore: any;
}

const color = defineModel<string>("color");
const darkThemeUrl = defineModel<string>("darkThemeUrl");
const lightThemeUrl = defineModel<string>("lightThemeUrl");

const props = defineProps<BaseRuntime>();

const { runtimeStore } = toRefs(props);

const useDarkThemeUrl = ref(false);

const useLightThemeUrl = ref(false);

const handleUpload = async (event, dark: boolean = false) => {
  try {
    const files = event.files;
    const resp = await http.post(
      "settings/upload",
      { file: files },
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );
    if (dark) {
      darkThemeUrl.value = resp.data;
    } else {
      lightThemeUrl.value = resp.data;
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

const handleUploadDark = async (event) => {
  await handleUpload(event, true);
};
</script>
<template>
  <div>
    <div class="text-xl mt-2">Color</div>
    <ColorPicker v-model="color" inline @change="updateColorPalette(color!)" />
    <InputText v-model="color" @change="updateColorPalette(color!)" />
    <div class="text-xl mt-2">Logo Dark Theme</div>
    <div>
      <FormField label="Use URL" :label-width="4">
        <ToggleSwitch v-model="useDarkThemeUrl" />
      </FormField>
    </div>
    <div class="align-items-center inline-flex">
      <div style="background-color: var(--p-surface-900)">
        <img
          :src="runtimeStore.logoUrl('white')"
          alt="Logo"
          style="height: 3rem" />
      </div>

      <FileUpload
        v-if="!useDarkThemeUrl"
        mode="basic"
        name="file"
        choose-icon="pi pi-pencil"
        accept="image/svg+xml"
        class="ml-2"
        :max-file-size="1000000"
        custom-upload
        :auto="true"
        choose-label="Change"
        @uploader="handleUploadDark" />
      <InputText v-else v-model="darkThemeUrl" class="ml-2" />
    </div>

    <div class="text-xl mt-2">Logo Light Theme</div>
    <FormField label="Use URL" :label-width="4">
      <ToggleSwitch v-model="useLightThemeUrl" />
    </FormField>
    <div class="align-items-center inline-flex">
      <div class="bg-white">
        <img
          :src="runtimeStore.logoUrl('dark')"
          alt="Logo"
          style="height: 3rem" />
      </div>
      <FileUpload
        v-if="!useLightThemeUrl"
        mode="basic"
        name="file"
        choose-icon="pi pi-pencil"
        custom-upload
        accept="image/svg+xml"
        class="ml-2"
        :max-file-size="1000000"
        :auto="true"
        choose-label="Change"
        @uploader="handleUpload" />
      <InputText v-else v-model="lightThemeUrl" class="ml-2" />
    </div>
  </div>
</template>
