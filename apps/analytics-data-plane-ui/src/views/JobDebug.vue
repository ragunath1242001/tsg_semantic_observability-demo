<script setup lang="ts">
import JobComponent from "../components/JobComponent.vue";
</script>

<template>
  <Card>
    <template #title>Jobs Debug</template>

    <template #content>
      This page allows for easy debugging of jobs. You can create jobs and see
      their logs. The job is created with a non-existing transfer id, so it will
      not be able to send or receive files. This is useful for testing the job
      creation and log retrieval functionality.
    </template>
  </Card>
  <JobComponent
    transfer-id="6d5f0dd9-c3f6-4f66-b0b0-10d6c04d68f0"
    role="consumer" />
</template>
