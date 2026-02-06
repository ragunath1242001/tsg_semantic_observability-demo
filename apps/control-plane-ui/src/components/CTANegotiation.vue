<script setup lang="ts">
import { NegotiationDetailDto } from "@tsg-dsp/common-dtos";
import { toRef } from "vue";

import NegotiationProceed from "../components/NegotiationProceed.vue";
import NegotiationRequest from "../components/NegotiationRequest.vue";

const props = defineProps<{
  negotiations: NegotiationDetailDto[];
}>();

const negotiations = toRef(props, "negotiations");
</script>
<template>
  <div v-if="negotiations.length > 0" class="grid grid-cols-12 gap-4">
    <div
      v-for="negotiation in negotiations"
      :key="negotiation.id"
      class="col-span-12 lg:col-span-6 xl:col-span-3">
      <NegotiationRequest
        v-if="negotiation.state === 'REQUESTED'"
        :negotiation="negotiation"></NegotiationRequest>
      <NegotiationProceed
        v-if="negotiation.state === 'AGREED'"
        :negotiation="negotiation"
        end-state="verify"></NegotiationProceed>
      <NegotiationProceed
        v-if="negotiation.state === 'VERIFIED'"
        :negotiation="negotiation"
        end-state="finalize"></NegotiationProceed>
    </div>
  </div>
</template>
