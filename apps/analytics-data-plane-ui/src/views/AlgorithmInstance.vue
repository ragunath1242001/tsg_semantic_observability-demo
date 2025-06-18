<script setup lang="ts">
import AlgorithmInstanceComponent from "../components/AlgorithmInstanceComponent.vue";
</script>

<template>
  <Card>
    <template #title>Create algorithm instance</template>

    <template #content>
      This page allows you to create an algorithm instance. You can enter the
      algorithm definition you want to use and configure the participants.
    </template>
  </Card>
  <AlgorithmInstanceComponent />
</template>
