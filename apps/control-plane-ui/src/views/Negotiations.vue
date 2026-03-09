<script setup lang="ts">
import { Action, Resource } from "@tsg-dsp/common-dtos";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { storeToRefs } from "pinia";
import { computed, onMounted } from "vue";

const userStore = useUserStore();
const canManageNegotiations = computed(() =>
  userStore.canAccessRoute(Action.UPDATE, Resource.CP_NEGOTIATION)
);

import CTANegotiation from "../components/CTANegotiation.vue";
import NegotiationHistory from "../components/NegotiationHistory.vue";
import { useDspStore } from "../stores/dsp";

const { negotiations, ctaNegotiations } = storeToRefs(useDspStore());

onMounted(async () => {
  await useDspStore().getNegotiations();
});
</script>
<template>
  <div>
    <Card class="mb-8">
      <template #title>Contract Negotiations</template>
      <template #content>
        This page shows (the history of) the negotiations that are present for
        the Control Plane. If there are actions required from you, they will
        appear above the negotiation history. All the actions that can be done
        on this page are implementations of the
        <a
          href="https://docs.internationaldataspaces.org/ids-knowledgebase/v/dataspace-protocol/contract-negotiation/contract.negotiation.protocol"
          target="_blank"
          >Contract Negotiation part of the Dataspace Protocol.</a
        >
      </template>
    </Card>
    <CTANegotiation
      v-if="canManageNegotiations"
      :negotiations="ctaNegotiations" />
    <NegotiationHistory :negotiations="negotiations"></NegotiationHistory>
  </div>
</template>
