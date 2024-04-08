<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useDspStore } from "../stores/dsp";
import TransferHistory from "../components/TransferHistory.vue";
import CTATransfer from "../components/CTATransfer.vue";
const { transfers, ctaTransfers } = storeToRefs(useDspStore());
</script>
<template>
  <div>
    <div class="card">
      <h1>Transfers</h1>

      <p>
        This page shows (the history of) the transfers that are present for the
        Control Plane.
      </p>
    </div>
    <CTATransfer :transfers="ctaTransfers"></CTATransfer>
    <TransferHistory :transfers="transfers"></TransferHistory>
  </div>
</template>
