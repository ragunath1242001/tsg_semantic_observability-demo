<script setup lang="ts">
import NegotiationRequest from "../components/NegotiationRequest.vue";
import NegotiationProceed from "../components/NegotiationProceed.vue";
import { NegotiationDetailDto } from "@libs/dtos";
import { toRef } from "vue";

const props = defineProps<{
  negotiations: NegotiationDetailDto[];
}>();

const negotiations = toRef(props, "negotiations");
</script>
<template>
  <div class="grid mt-5">
    <div
      class="col-12 lg:col-6 xl:col-3"
      v-for="negotiation in negotiations"
      :key="negotiation.localId"
    >
      <NegotiationRequest
        v-if="negotiation.state === 'dspace:REQUESTED'"
        :negotiation="negotiation"
      ></NegotiationRequest>
      <NegotiationProceed
        v-if="negotiation.state === 'dspace:AGREED'"
        :negotiation="negotiation"
        endState="verify"
      ></NegotiationProceed>
      <NegotiationProceed
        v-if="negotiation.state === 'dspace:VERIFIED'"
        :negotiation="negotiation"
        endState="finalize"
      ></NegotiationProceed>
    </div>
  </div>
</template>
