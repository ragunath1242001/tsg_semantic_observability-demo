<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useDspStore } from "../stores/dsp";
import TransferHistory from "../components/TransferHistory.vue";
import CTATransfer from "../components/CTATransfer.vue";
const { transfers, ctaTransfers } = storeToRefs(useDspStore());
</script>
<template>
  <div>
    <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
      <template #title>Transfers</template>
      <template #content>
        <p>
          This page shows (the history of) the transfers that are present for
          the Control Plane.
        </p>
      </template>
    </Card>
    <CTATransfer :transfers="ctaTransfers"></CTATransfer>
    <TransferHistory :transfers="transfers"></TransferHistory>
  </div>
</template>
