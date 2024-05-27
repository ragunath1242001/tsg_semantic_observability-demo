<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useDspStore } from "../stores/dsp";
import TransferHistory from "../components/TransferHistory.vue";
import CTATransfer from "../components/CTATransfer.vue";
const { transfers, ctaTransfers } = storeToRefs(useDspStore());
</script>
<template>
  <div>
    <Card
      style="border-radius: 12px; border: 1px solid var(--surface-border)"
      class="mb-5"
    >
      <template #title>Transfers</template>
      <template #content>
        <p>
          This page shows (the history of) the transfers that are present for
          the Control Plane. It also allows you to suspend, (re)start and
          terminate transfers, according to the
          <a
            href="https://docs.internationaldataspaces.org/ids-knowledgebase/v/dataspace-protocol/transfer-process/transfer.process.protocol"
            target="_blank"
            >Transfer Process part of the Dataspace Protocol.</a
          >
        </p>
      </template>
    </Card>
    <CTATransfer :transfers="ctaTransfers"></CTATransfer>
    <TransferHistory :transfers="transfers"></TransferHistory>
  </div>
</template>
