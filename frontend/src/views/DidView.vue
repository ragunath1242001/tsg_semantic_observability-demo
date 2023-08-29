<template>
  <div>
    <div class="card">
      <div class="card-header">
        <p class="card-header-title">DID Document</p>
      </div>
      <div class="card-content">
        <p>The current DID document registered for this Wallet instance</p>
        <template v-if="didDocument">
          <h3 class="subtitle mt-4">Main DID info</h3>
          <b-field horizontal label="Contexts">
            <div>
              <div :key="`context-${id}`" v-for="(context, id) in didDocument['@context']"><code>{{ context }}</code>
              </div>
            </div>
          </b-field>
          <b-field horizontal label="ID">
            <code>{{ didDocument.id }}</code>
          </b-field>
          <h3 class="subtitle mt-4">Verification Methods</h3>
          <b-table :data="didDocument.verificationMethod">
            <b-table-column field="id" label="ID" v-slot="props">
              <code>{{ props.row.id.replace(`${didDocument.id}#`,'') }}</code>
            </b-table-column>
            <b-table-column field="type" label="Type" v-slot="props">
              {{ props.row.type }}
            </b-table-column>
            <b-table-column field="controller" label="Controller" v-slot="props">
              <code>{{ props.row.controller }}</code> {{  }}
            </b-table-column>
            <b-table-column field="algorithm" label="Algorithm" v-slot="props">
              <code>{{ props.row.publicKeyJwk.kty }} {{ props.row.publicKeyJwk.crv || props.row.publicKeyJwk.alg }}</code>
            </b-table-column>

          </b-table>
          <b-collapse :open="false" aria-id="didjson" class="mt-6">
            <template #trigger="props">
              <b-button 
                :label="(props.open) ? 'Hide raw DID document' : 'Show raw DID document'"
                type="is-primary" 
                aria-controls="didjson" 
                :aria-expanded="props.open" />
            </template>
            <code-highlight v-if="didDocument" :code="didDocument" />
          </b-collapse>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { axiosInstance } from '@/store';
import { DIDDocument } from 'did-resolver';
import Vue from 'vue';
import CodeHighlight from '../components/CodeHighlight.vue'

export default Vue.extend({
  name: 'DidView',
  components: {
    CodeHighlight
  },
  data(): {
    didDocument: DIDDocument | undefined
  } {
    return {
      didDocument: undefined
    }
  },
  async created() {
      const response = await axiosInstance.get<DIDDocument>('/.well-known/did.json', {baseURL: ''});
      this.didDocument = response.data;
  },
});
</script>
