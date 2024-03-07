<script setup lang="ts">
import CTANegotiation from "../components/CTANegotiation.vue";

import { useNegotiationStore } from "../stores/negotiations";
import { storeToRefs } from "pinia";
import NegotiationHistory from "../components/NegotiationHistory.vue";

const { negotiations, ctaNegotiations } = storeToRefs(useNegotiationStore());
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
