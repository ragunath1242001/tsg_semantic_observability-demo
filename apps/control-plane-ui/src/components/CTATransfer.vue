<script setup lang="ts">
import { TransferDetailDto } from "@tsg-dsp/common-dsp";
import TransferProceed from "./TransferProceed.vue";
import { toRef } from "vue";

const props = defineProps<{
  transfers: TransferDetailDto[];
}>();

const transfers = toRef(props, "transfers");
</script>
<template>
  <div v-if="transfers.length > 0" class="grid grid-cols-12 gap-4">
    <div
      v-for="transfer in transfers"
      :key="transfer.localId"
      class="col-span-12 lg:col-span-6 xl:col-span-3">
      <TransferProceed :transfer="transfer"></TransferProceed>
    </div>
  </div>
</template>
