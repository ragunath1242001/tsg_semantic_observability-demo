<script setup lang="ts">
import FileUploadComponent from "../components/FileUploadComponent.vue";
</script>

<template>
  <Card>
    <template #title>Upload files</template>
    <template #content>
      <FileUploadComponent />
    </template>
  </Card>
</template>
