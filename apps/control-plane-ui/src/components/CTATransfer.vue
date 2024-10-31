<script setup lang="ts">
import { TransferStatus } from "@tsg-dsp/control-plane-dtos";
import TransferProceed from "./TransferProceed.vue";
import { toRef } from "vue";

const props = defineProps<{
  transfers: TransferStatus[];
}>();

const transfers = toRef(props, "transfers");
</script>
<template>
  <div class="grid grid-cols-12 gap-4" v-if="transfers.length > 0">
    <div
      class="col-span-12 lg:col-span-6 xl:col-span-3"
      v-for="transfer in transfers"
      :key="transfer.localId">
      <TransferProceed :transfer="transfer"></TransferProceed>
    </div>
  </div>
</template>
