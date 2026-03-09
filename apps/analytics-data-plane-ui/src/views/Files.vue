<script setup lang="ts">
import { Action, Resource } from "@tsg-dsp/common-dtos";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { computed, useTemplateRef } from "vue";

import FilesComponent from "../components/FilesComponent.vue";
import FileUploadComponent from "../components/FileUploadComponent.vue";

const filesComponentRef = useTemplateRef("filesComponent");

const userStore = useUserStore();

const canUploadFiles = computed(() =>
  userStore.canAccessRoute(Action.CREATE, Resource.ADP_FILE)
);

const onUploaded = () => {
  filesComponentRef.value?.getFiles();
  setTimeout(() => {
    filesComponentRef.value?.getFiles();
  }, 5000);
};
</script>
<template>
  <Card v-if="canUploadFiles">
    <template #title>Upload files</template>
    <template #content>
      <FileUploadComponent @uploaded="onUploaded" />
    </template>
  </Card>
  <Card class="mt-5">
    <template #title>Current files</template>
    <template #content><FilesComponent ref="filesComponent" /></template>
  </Card>
</template>
