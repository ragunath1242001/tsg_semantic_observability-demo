<script setup lang="ts">
import { onMounted, ref } from "vue";
import { axiosInstance } from "../store/index.js";
import { DIDDocument } from "did-resolver";
import { useToast } from "primevue/usetoast";

const toast = useToast();

const didDocument = ref<DIDDocument>();
const didDialog = ref(false);

const numberOfVerificationMethods = ref(0);
const numberOfAssertionMethods = ref(0);
const numberOfServices = ref(0);

const getDidDocument = async () => {
  try {
    const response = await axiosInstance.get<DIDDocument>(
      "/.well-known/did.json",
      { baseURL: "" }
    );
    didDocument.value = response.data;
    numberOfVerificationMethods.value =
      response.data.verificationMethod?.length ?? 0;
    numberOfAssertionMethods.value = response.data.assertionMethod?.length ?? 0;
    numberOfServices.value = response.data.service?.length ?? 0;
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "DID Resolvement failed",
      detail: "Could not load DID document from well-known address",
      life: 10000,
    });
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
        <p>Welcome to the Wallet dashboard, on this page an overview of the DID document for this Wallet instance is provided.</p>
        <p>The DID document is the primary entry point for external entities to retrieve relevant information related to your wallet.</p>
        <p>Via the menu on the left you can navigate to specific elements for managing this Wallet instance.</p>
      </template>
    </Card>
    <div class="grid card-container mt-5">
      <div class="col-12 lg:col-6 xl:col-4" v-if="!didDocument">
        <Card>
          <template #content>
            <div class="flex justify-content-between mb-3">
              <div>
                <span class="block text-500 font-medium mb-3"
                  >No DID document loaded</span
                >
              </div>
              <div
                class="flex align-items-center justify-content-center bg-yellow-100 border-round"
                style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
              >
                <i class="pi pi-exclamation-triangle text-yellow-500 text-xl"></i>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <template v-else>
        <div class="col-12 lg:col-6 xl:col-4">
          <Card>
            <template #content>
              <div class="flex justify-content-between mb-3">
                <div>
                  <span class="block text-500 font-medium mb-3">Contexts</span>
                  <div class="text-900 font-medium text-sm">
                    <ul>
                      <li v-for="context in didDocument['@context']">
                        {{ context }}
                      </li>
                    </ul>
                  </div>
                </div>
                <div
                  class="flex align-items-center justify-content-center bg-blue-100 border-round"
                  style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
                >
                  <i class="pi pi-search-plus text-blue-500 text-xl"></i>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-12 lg:col-6 xl:col-4">
          <Card>
            <template #content>
              <div class="flex justify-content-between mb-3">
                <div>
                  <span class="block text-500 font-medium mb-3"
                    >DID Identifier</span
                  >
                  <div class="text-900 font-medium text-sm">
                    {{ didDocument.id }}
                  </div>
                </div>
                <div
                  class="flex align-items-center justify-content-center bg-orange-100 border-round"
                  style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
                >
                  <i class="pi pi-id-card text-orange-500 text-xl"></i>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-12 lg:col-6 xl:col-4">
          <Card>
            <template #content>
              <div class="flex justify-content-between mb-3">
                <div>
                  <span class="block text-500 font-medium mb-3"
                    >Verification Methods
                  </span>
                  <div class="text-900 font-medium text-xl">
                    {{ numberOfVerificationMethods }}
                  </div>
                </div>
                <div
                  class="flex align-items-center justify-content-center bg-cyan-100 border-round"
                  style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
                >
                  <i class="pi pi-verified text-cyan-500 text-xl"></i>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-12 lg:col-6 xl:col-4">
          <Card>
            <template #content>
              <div class="flex justify-content-between mb-3">
                <div>
                  <span class="block text-500 font-medium mb-3"
                    >Assertion Methods
                  </span>
                  <div class="text-900 font-medium text-xl">
                    {{ numberOfAssertionMethods }}
                  </div>
                </div>
                <div
                  class="flex align-items-center justify-content-center bg-purple-100 border-round"
                  style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
                >
                  <i class="pi pi-key text-purple-500 text-xl"></i>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-12 lg:col-6 xl:col-4">
          <Card>
            <template #content>
              <div class="flex justify-content-between mb-3">
                <div>
                  <span class="block text-500 font-medium mb-3"
                    >Services
                  </span>
                  <div class="text-900 font-medium text-xl">
                    {{ numberOfServices }}
                  </div>
                </div>
                <div
                  class="flex align-items-center justify-content-center bg-blue-100 border-round"
                  style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1"
                >
                  <i class="pi pi-cloud text-blue-500 text-xl"></i>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-12 lg:col-6 xl:col-4">
          <Card>
            <template #content>
              <div class="flex justify-content-between mb-3">
                <div>
                  <div class="text-900 font-medium text-sm">
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
                  class="flex align-items-center justify-content-center bg-yellow-100 border-round"
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
