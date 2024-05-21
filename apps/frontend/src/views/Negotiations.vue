<script setup lang="ts">
import CTANegotiation from "../components/CTANegotiation.vue";

import { useDspStore } from "../stores/dsp";
import { storeToRefs } from "pinia";
import NegotiationHistory from "../components/NegotiationHistory.vue";

const { negotiations, ctaNegotiations } = storeToRefs(useDspStore());
</script>
<template>
  <div>
    <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
      <template #title>Negotiations</template>
      <template #subtitle>
        This page shows (the history of) the negotiations that are present for
        the Control Plane. If there are actions required from you, they will
        appear above the negotiation history.
      </template>
    </Card>
    <CTANegotiation :negotiations="ctaNegotiations" />
    <NegotiationHistory :negotiations="negotiations"></NegotiationHistory>
  </div>
</template>
