<script setup lang="ts">
import { useTemplateRef } from "vue";

import FilesComponent from "../components/FilesComponent.vue";
import FileUploadComponent from "../components/FileUploadComponent.vue";

const filesComponentRef = useTemplateRef("filesComponent");
</script>
<template>
  <Card>
    <template #title>Upload files</template>
    <template #content>
      <FileUploadComponent @uploaded="() => filesComponentRef.getFiles()" />
    </template>
  </Card>
  <Card class="mt-5">
    <template #title>Current files</template>
    <template #content><FilesComponent ref="filesComponent" /></template>
  </Card>
</template>
