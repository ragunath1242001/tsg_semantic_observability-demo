<script setup lang="ts">
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";

const userStore = useUserStore();

import CTATransfer from "../components/CTATransfer.vue";
import TransferHistory from "../components/TransferHistory.vue";
import { useDspStore } from "../stores/dsp";
const { transfers, ctaTransfers } = storeToRefs(useDspStore());

onMounted(async () => {
  await useDspStore().getTransfers();
});
</script>
<template>
  <div>
    <Card class="mb-8">
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
    <CTATransfer
      v-if="!userStore.isReadOnly"
      :transfers="ctaTransfers"></CTATransfer>
    <TransferHistory :transfers="transfers"></TransferHistory>
  </div>
</template>
