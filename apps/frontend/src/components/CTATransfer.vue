<script setup lang="ts">
import { TransferStatusDto } from "@libs/dtos";
import TransferProceed from "./TransferProceed.vue";
import { toRef } from "vue";

const props = defineProps<{
  transfers: TransferStatusDto[];
}>();

const transfers = toRef(props, "transfers");
</script>
<template>
  <div class="grid mt-2">
    <div
      class="col-12 lg:col-6 xl:col-3"
      v-for="transfer in transfers"
      :key="transfer.localId"
    >
      <TransferProceed :transfer="transfer"></TransferProceed>
    </div>
  </div>
</template>
