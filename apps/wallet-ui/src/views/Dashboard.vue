<script setup lang="ts">
import { onMounted, ref } from "vue";
import { DIDDocument } from "did-resolver";
import { useToast } from "primevue/usetoast";
import http from "@tsg-dsp/common-ui/utils/http";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

const toast = useToast();

const didDocument = ref<DIDDocument>();
const didDialog = ref(false);

const numberOfVerificationMethods = ref(0);
const numberOfAssertionMethods = ref(0);
const numberOfServices = ref(0);

const getDidDocument = async () => {
  try {
    const response = await http.get<DIDDocument>("management/did");
    didDocument.value = response.data;
    numberOfVerificationMethods.value =
      response.data.verificationMethod?.length ?? 0;
    numberOfAssertionMethods.value = response.data.assertionMethod?.length ?? 0;
    numberOfServices.value = response.data.service?.length ?? 0;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "DID resolvement failed",
        defaultMessage: `Error in resolving own DID document`,
      })
    );
  }
};

onMounted(async () => {
  await getDidDocument();
});
</script>

<template>
  <div>
    <Card>
      <template #title>Wallet Dashboard</template>
      <template #content>
        <p>
          Welcome to the Wallet dashboard, on this page an overview of the DID
          document for this Wallet instance is provided.
        </p>
        <p>
          The DID document is the primary entry point for external entities to
          retrieve relevant information related to your wallet.
        </p>
        <p>
          Via the menu on the left you can navigate to specific elements for
          managing this Wallet instance.
        </p>
      </template>
    </Card>
    <div class="flex grid grid-cols-12 gap-4 mt-8">
      <div class="col-span-12 lg:col-span-6 xl:col-span-4" v-if="!didDocument">
        <Card>
          <template #content>
            <div class="flex justify-between mb-4">
              <div>
                <span
                  class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
                  >No DID document loaded</span
                >
              </div>
              <div
                class="flex items-center justify-center bg-yellow-100 rounded-border"
                style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
              >
                <i
                  class="pi pi-exclamation-triangle text-yellow-500 text-xl"
                ></i>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <template v-else>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
          <Card class="h-full">
            <template #content>
              <div class="flex justify-between mb-4">
                <div>
                  <span
                    class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
                    >Contexts</span
                  >
                  <div
                    class="text-surface-900 dark:text-surface-0 font-medium text-sm"
                  >
                    <ul>
                      <li v-for="context in didDocument['@context']">
                        {{ context }}
                      </li>
                    </ul>
                  </div>
                </div>
                <div
                  class="flex items-center justify-center bg-blue-100 rounded-border"
                  style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
                >
                  <i class="pi pi-search-plus text-blue-500 text-xl"></i>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
          <Card class="h-full">
            <template #content>
              <div class="flex justify-between mb-4">
                <div>
                  <span
                    class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
                    >DID Identifier</span
                  >
                  <div
                    class="text-surface-900 dark:text-surface-0 font-medium text-sm"
                  >
                    {{ didDocument.id }}
                  </div>
                </div>
                <div
                  class="flex items-center justify-center bg-orange-100 rounded-border"
                  style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
                >
                  <i class="pi pi-id-card text-orange-500 text-xl"></i>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
          <Card class="h-full">
            <template #content>
              <div class="flex justify-between mb-4">
                <div>
                  <span
                    class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
                    >Verification Methods
                  </span>
                  <div
                    class="text-surface-900 dark:text-surface-0 font-medium text-xl"
                  >
                    {{ numberOfVerificationMethods }}
                  </div>
                </div>
                <div
                  class="flex items-center justify-center bg-cyan-100 rounded-border"
                  style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
                >
                  <i class="pi pi-verified text-cyan-500 text-xl"></i>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
          <Card class="h-full">
            <template #content>
              <div class="flex justify-between mb-4">
                <div>
                  <span
                    class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
                    >Assertion Methods
                  </span>
                  <div
                    class="text-surface-900 dark:text-surface-0 font-medium text-xl"
                  >
                    {{ numberOfAssertionMethods }}
                  </div>
                </div>
                <div
                  class="flex items-center justify-center bg-purple-100 rounded-border"
                  style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
                >
                  <i class="pi pi-key text-purple-500 text-xl"></i>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
          <Card class="h-full">
            <template #content>
              <div class="flex justify-between mb-4">
                <div>
                  <span
                    class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
                    >Services
                  </span>
                  <div
                    class="text-surface-900 dark:text-surface-0 font-medium text-xl"
                  >
                    {{ numberOfServices }}
                  </div>
                </div>
                <div
                  class="flex items-center justify-center bg-blue-100 rounded-border"
                  style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
                >
                  <i class="pi pi-cloud text-blue-500 text-xl"></i>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
          <Card class="h-full">
            <template #content>
              <div class="flex justify-between mb-4">
                <div>
                  <div
                    class="text-surface-900 dark:text-surface-0 font-medium text-sm"
                  >
                    <Button
                      label="Show raw DID document"
                      @click="didDialog = true"
                    />
                    <Dialog
                      v-model:visible="didDialog"
                      modal
                      header="Raw DID document"
                      :style="{ width: '90vw', maxWidth: '75rem' }"
                    >
                      <MonacoEditorVue
                        :static="didDocument"
                        :read-only="true"
                        :max-lines="100"
                      />
                    </Dialog>
                  </div>
                </div>
                <div
                  class="flex items-center justify-center bg-yellow-100 rounded-border"
                  style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
                >
                  <i class="pi pi-file text-yellow-500 text-xl"></i>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </template>
    </div>
  </div>
</template>
<style scoped>
.card-container {
  display: flex;
  flex-wrap: wrap;
}

.card {
  flex: 1 1 auto;
  margin-right: 1rem; /* Adjust margin as needed */
}
</style>
