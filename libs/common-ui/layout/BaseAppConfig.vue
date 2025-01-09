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
    <ColorPicker
      v-model="color"
      v-on:change="updateColorPalette(color!)"
      inline />
    <InputText v-model="color" v-on:change="updateColorPalette(color!)" />
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
        mode="basic"
        name="file"
        chooseIcon="pi pi-pencil"
        v-if="!useDarkThemeUrl"
        accept="image/svg+xml"
        class="ml-2"
        :maxFileSize="1000000"
        @uploader="handleUploadDark"
        custom-upload
        :auto="true"
        chooseLabel="Change" />
      <InputText v-else class="ml-2" v-model="darkThemeUrl" />
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
        mode="basic"
        name="file"
        chooseIcon="pi pi-pencil"
        custom-upload
        v-if="!useLightThemeUrl"
        accept="image/svg+xml"
        class="ml-2"
        :maxFileSize="1000000"
        :auto="true"
        @uploader="handleUpload"
        chooseLabel="Change" />
      <InputText v-else class="ml-2" v-model="lightThemeUrl" />
    </div>
  </div>
</template>
