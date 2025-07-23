<script setup lang="ts">
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { useToast } from "primevue";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import JobComponent from "@/components/JobComponent.vue";
import TransferComponent from "@/components/TransferComponent.vue";

import { useAlgorithmInstancesStore } from "../../stores/algorithm-instances";

const route = useRoute();
const algorithmInstancesStore = useAlgorithmInstancesStore();
const toast = useToast();

const transferId = route.params.id as string;
const algorithmInstanceId = ref<string>();

const fetchAlgorithmInstanceForTransfer = async () => {
  try {
    // Fetch the algorithm instance associated with this transfer
    const algorithmInstance =
      await algorithmInstancesStore.fetchAlgorithmInstanceForTransfer(
        transferId
      );
    algorithmInstanceId.value = algorithmInstance.id;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading algorithm instance failed",
        defaultMessage: "Could not load algorithm instance for this transfer"
      })
    );
  }
};

onMounted(async () => {
  await fetchAlgorithmInstanceForTransfer();
});
</script>
<template>
  <div>
    <TransferComponent :transfer-id="transferId" />
    <JobComponent
      v-if="algorithmInstanceId"
      :algorithm-instance-id="algorithmInstanceId"
      role="provider" />
  </div>
</template>
