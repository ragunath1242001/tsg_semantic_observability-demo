<script setup lang="ts">
import { useRoute } from "vue-router";

import JobComponent from "@/components/JobComponent.vue";
import TransferComponent from "@/components/TransferComponent.vue";

const route = useRoute();

const transferId = route.params.id;
</script>
<template>
  <div>
    <TransferComponent :transfer-id="transferId" />
    <JobComponent :transfer-id="transferId" role="provider" />
  </div>
</template>
