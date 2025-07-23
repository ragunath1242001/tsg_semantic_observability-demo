<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { useToast } from "primevue";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import JobComponent from "../components/JobComponent.vue";
import { useAlgorithmInstancesStore } from "../stores/algorithm-instances";

const route = useRoute();
const algorithmInstancesStore = useAlgorithmInstancesStore();
const toast = useToast();

const selectedAlgorithmInstanceId = ref<string>(
  route.query.algorithmInstanceId as string
);

const loadAlgorithmInstances = async () => {
  try {
    await algorithmInstancesStore.fetchAlgorithmInstances();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading algorithm instances failed",
        defaultMessage:
          "Could not load algorithm instances from the analytics data plane"
      })
    );
  }
};

const instanceOptions = computed(() => {
  return algorithmInstancesStore.algorithmInstances.map((instance) => ({
    label: instance.algorithmDefinition.title,
    value: instance.id
  }));
});

// Watch for route changes to update the selected algorithm instance
watch(
  () => route.query.algorithmInstanceId,
  (newAlgorithmInstanceId) => {
    if (newAlgorithmInstanceId && typeof newAlgorithmInstanceId === "string") {
      selectedAlgorithmInstanceId.value = newAlgorithmInstanceId;
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await loadAlgorithmInstances();
});
</script>

<template>
  <Card>
    <template #title>Jobs Debug</template>

    <template #content>
      This page allows for easy debugging of jobs. You can create jobs and see
      their logs. Select an algorithm instance below to test job creation and
      log retrieval functionality with real or test data.
    </template>
  </Card>

  <Card class="mt-5">
    <template #title>Debug Configuration</template>
    <template #content>
      <FormField label="Algorithm Instance">
        <Select
          id="algorithm-instance"
          v-model="selectedAlgorithmInstanceId"
          :options="instanceOptions"
          option-label="label"
          option-value="value"
          placeholder="Select an algorithm instance"
          class="w-full"
          :loading="algorithmInstancesStore.loading" />
        <Message size="small" variant="simple" severity="secondary"
          >Select an algorithm instance to test job creation. Use the test
          algorithm instance for isolated testing.</Message
        >
      </FormField>

      <div v-if="selectedAlgorithmInstanceId" class="mt-4">
        <Message severity="info" size="small" variant="simple"
          >Currently debugging with Algorithm Instance ID:
          <code>{{ selectedAlgorithmInstanceId }}</code>
        </Message>
      </div>
    </template>
  </Card>

  <JobComponent
    v-if="selectedAlgorithmInstanceId"
    :algorithm-instance-id="selectedAlgorithmInstanceId" />
</template>
