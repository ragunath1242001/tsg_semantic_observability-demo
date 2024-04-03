<script setup lang="ts">
import { TransferDetailDto } from "@libs/dtos";
import TransferProceed from "./TransferProceed.vue";
import { toRef } from "vue";

const props = defineProps<{
  transfers: TransferDetailDto[];
}>();

const transfers = toRef(props, "transfers");
console.log(transfers.value);
</script>
<template>
  <div class="grid">
    <div
      class="col-12 lg:col-6 xl:col-3"
      v-for="transfer in transfers"
      :key="transfer.localId"
    >
      <TransferProceed :transfer="transfer"></TransferProceed>
    </div>
  </div>
</template>
