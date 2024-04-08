<script setup lang="ts">
import CTANegotiation from "../components/CTANegotiation.vue";

import { useDspStore } from "../stores/dsp";
import { storeToRefs } from "pinia";
import NegotiationHistory from "../components/NegotiationHistory.vue";

const { negotiations, ctaNegotiations } = storeToRefs(useDspStore());
</script>
<template>
  <div>
    <div class="card">
      <h1>Negotiations</h1>

      <p>
        This page shows (the history of) the negotiations that are present for
        the Control Plane.
      </p>
    </div>
    <CTANegotiation :negotiations="ctaNegotiations" />
    <NegotiationHistory :negotiations="negotiations"></NegotiationHistory>
  </div>
</template>
