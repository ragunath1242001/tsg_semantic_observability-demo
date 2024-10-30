<script setup lang="ts">
import FilesComponent from "../components/FilesComponent.vue";
</script>
<template>
  <Card>
    <template #title>Current files</template>

    <template #content><FilesComponent /></template>
  </Card>
</template>
