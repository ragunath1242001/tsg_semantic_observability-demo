<script setup lang="ts">
import { onMounted, ref } from "vue";
import { axiosInstance } from "../store/index.js";
import { DIDDocument } from 'did-resolver';
import { useToast } from "primevue/usetoast";
import { JsonTreeView } from "json-tree-view-vue3";

const toast = useToast();

const didDocument = ref<DIDDocument>();
const didDialog = ref(false);

var numberOfVerificationMethods = ref(0);
var numberOfAssertionMethods = ref(0);

const getDidDocument = async () => {
  try {
    const response = await axiosInstance.get<DIDDocument>('https://issuer.oid4vci.heracles.dataspac.es/.well-known/did.json', {baseURL: ''});
    didDocument.value = response.data;
    numberOfVerificationMethods.value = response.data.verificationMethod?.length ?? 0;
    numberOfAssertionMethods.value = response.data.assertionMethod?.length ?? 0
  } catch (err) {
    toast.add({severity: 'warn', summary: 'DID Resolvement failed', detail: 'Could not load DID document from well-known address', life: 10000})
  }
}

onMounted(async () => {
  await getDidDocument();
});
</script>

<template>
  <div>
    <div class="card">
      <h1>Wallet Dashboard</h1>

      <p>
        This page presents an overview of the DID document for this Wallet instance.
      </p>
    </div>
    <div class="grid card-container">
      <div class="col-12 lg:col-6 xl:col-4" v-if="!didDocument">
        <div class="card mb-0">
          <div class="flex justify-content-between mb-3">
            <div>
              <span class="block text-500 font-medium mb-3">No DID document loaded</span>
            </div>
            <div
              class="flex align-items-center justify-content-center bg-yellow-100 border-round"
              style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1;"
            >
              <i class="pi pi-exclamation-triangle text-yellow-500 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 lg:col-6 xl:col-4" v-if="didDocument">
        <div class="card mb-0">
          <div class="flex justify-content-between mb-3">
            <div>
              <span class="block text-500 font-medium mb-3">Contexts</span>
              <div class="text-900 font-medium text-sm">
                <ul>
                  <li v-for="context in didDocument['@context']">{{ context }}</li>
                </ul>
              </div>
            </div>
            <div
              class="flex align-items-center justify-content-center bg-blue-100 border-round"
              style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1;"
            >
              <i class="pi pi-file text-blue-500 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 lg:col-6 xl:col-4" v-if="didDocument">
        <div class="card mb-0">
          <div class="flex justify-content-between mb-3">
            <div>
              <span class="block text-500 font-medium mb-3">DID Identifier</span>
              <div class="text-900 font-medium text-sm">
                {{ didDocument.id }}
              </div>
            </div>
            <div
              class="flex align-items-center justify-content-center bg-blue-100 border-round"
              style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1;"
            >
              <i class="pi pi-file text-blue-500 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 lg:col-6 xl:col-4" v-if="didDocument">
        <div class="card mb-0">
          <div class="flex justify-content-between mb-3">
            <div>
              <span class="block text-500 font-medium mb-3">Verification Methods </span>
              <div class="text-900 font-medium text-xl">
                {{ numberOfVerificationMethods }}
              </div>
            </div>
            <div
              class="flex align-items-center justify-content-center bg-blue-100 border-round"
              style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1;"
            >
              <i class="pi pi-file text-blue-500 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 lg:col-6 xl:col-4" v-if="didDocument">
        <div class="card mb-0">
          <div class="flex justify-content-between mb-3">
            <div>
              <span class="block text-500 font-medium mb-3">Assertion Methods </span>
              <div class="text-900 font-medium text-xl">
                {{ numberOfAssertionMethods }}
              </div>
            </div>
            <div
              class="flex align-items-center justify-content-center bg-blue-100 border-round"
              style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1;"
            >
              <i class="pi pi-file text-blue-500 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 lg:col-6 xl:col-4" v-if="didDocument">
        <div class="card mb-0">
          <div class="flex justify-content-between mb-3">
            <div>
              <div class="text-900 font-medium text-sm">
                <Button label="Show raw DID document" @click="didDialog = true" />
                <Dialog v-model:visible="didDialog" modal header="Raw DID document" :style="{width: '90vw', maxWidth: '75rem'}">
                  <JsonTreeView 
                    :data="JSON.stringify(didDocument)"
                    color-scheme="dark"
                    root-key="DIDDocument"
                    :max-depth="5"
                  />
                </Dialog>
              </div>
            </div>
            <div
              class="flex align-items-center justify-content-center bg-blue-100 border-round"
              style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1;"
            >
              <i class="pi pi-file text-blue-500 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
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