<template>
  <div>
    <div class="card">
      <div class="card-header">
        <p class="card-header-title">Keys</p>
      </div>
      <div class="card-content">
        <p>The current keys registered for this Wallet instance:</p>
        <b-table :data="keys">
            <b-table-column field="id" label="ID" v-slot="props">
              <code>{{ props.row.id.split('#').slice(-1)[0] }}</code>
            </b-table-column>
            <b-table-column field="type" label="Type" v-slot="props">
              {{ props.row.type }}
            </b-table-column>
            <b-table-column field="default" label="Default" v-slot="props">
              <b-icon v-if="props.row.default" icon="check-bold" type="is-success" />
              <b-icon v-else icon="close-thick" type="is-danger" />
            </b-table-column>
            <b-table-column field="algorithm" label="Algorithm" v-slot="props">
              <code>{{ props.row.publicKey.kty }} {{ props.row.publicKey.crv || props.row.publicKey.alg }}</code>
            </b-table-column>
            <b-table-column field="actions" label="Actions" v-slot="props">
              <div class="buttons">
                <b-button type="is-primary" :disabled="props.row.default" @click="setDefaultKey(props.row.id)">Default</b-button>
                <b-button type="is-danger" @click="deleteKey(props.row.id)" icon-right="delete"></b-button>
              </div>
            </b-table-column>
        </b-table>

        <b-collapse :open="false" aria-id="keysjson" class="mt-6">
          <template #trigger="props">
            <b-button 
              :label="(props.open) ? 'Hide raw keys JSON' : 'Show raw keys JSON'"
              type="is-primary" 
              aria-controls="keysjson" 
              :aria-expanded="props.open" />
          </template>
          <code-highlight v-if="keys" :code="keys" />
        </b-collapse>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <p class="card-header-title">Add key</p>
      </div>
      <div class="card-content">
        <form id="addKey" @submit.prevent="addKey">
          <b-field horizontal label="Type" message="Type of key, normally EdDSA provides the right amount of security with a very small signature size">
            <b-select placeholder="Key type" v-model="addKeyForm.type">
              <option value="EdDSA">EdDSA (Edwards-curve DSA)</option>
              <option value="ES384">ES384 (P-384 curve DSA)</option>
              <option value="X509">RSA</option>
            </b-select>
          </b-field>
          <b-field horizontal label="Key ID" message="Will be prepended with the DID identifier and a hashtag">
            <b-input placeholder="Key ID" v-model="addKeyForm.id" required  />
          </b-field>
          <b-field horizontal label="Default" message="Set this new key as default key">
            <b-checkbox v-model="addKeyForm.default"></b-checkbox>
          </b-field>
          <b-field v-if="addKeyForm.type === 'X509'" horizontal label="Existing key (PKCS#8)">
            <b-input type="textarea" v-model="addKeyForm.existingKey"></b-input>
          </b-field>
          <b-field v-if="addKeyForm.type === 'X509'" horizontal label="Existing certificate (chain) (PEM)">
            <b-input type="textarea" v-model="addKeyForm.existingCertificate"></b-input>
          </b-field>
          <b-field horizontal>
            <b-button type="is-primary" @click="addKey">Add key</b-button>
          </b-field>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { axiosInstance } from '@/store';
import Vue from 'vue';
import CodeHighlight from '../components/CodeHighlight.vue';
import { KeyMaterials } from '../model/keys'; 

export default Vue.extend({
  name: 'KeysView',
  components: {
    CodeHighlight
  },
  data(): {
    keys: KeyMaterials[] | undefined,
    addKeyForm: {
      type: 'EdDSA' | 'ES384' | 'X509',
      id: string,
      default: boolean,
      existingKey?: string,
      existingCertificate?: string
    }
  } {
    return {
      keys: undefined,
      addKeyForm: {
        type: 'EdDSA',
        id: 'key-',
        default: false
      }
    }
  },
  async created() {
    await this.loadKeys();
  },
  methods: {
    async loadKeys() {
      try {
        const response = await axiosInstance<KeyMaterials[]>('management/keys');
        this.keys = response.data;
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in loading keys',
          type: 'is-danger'
        });
      }
    },
    async setDefaultKey(keyId: string) {
      try {
        await axiosInstance.put(`management/keys/${encodeURIComponent(keyId)}/default`);
        await this.loadKeys();
        this.$buefy.toast.open({
          message: 'Default key updated',
          type: 'is-success'
        });
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in updating default key',
          type: 'is-danger'
        });
      }
    },
    async deleteKey(keyId: string) {
      this.$buefy.dialog.confirm({
          message: 'Are you sure you want to delete this key?<br /><br />Existing credentials signed with this key <strong>cannot</strong> be used for verifiable presentations anymore!',
          onConfirm: async () => {
            try {
              await axiosInstance.delete(`management/keys/${encodeURIComponent(keyId)}`);
              await this.loadKeys();
              this.$buefy.toast.open({
                message: 'Deleted key',
                type: 'is-success'
              });
            } catch (err) {
              this.$buefy.toast.open({
                message: 'Error in deleting key',
                type: 'is-danger'
              });
            }
          }
      })
    },
    async addKey() {
      if (!this.getFormElement('addKey').checkValidity()){
        this.$buefy.toast.open({
          message: 'Please fill all required fields',
          duration: 10000,
          type: 'is-warning',
        });
        return;
      }
      try {
        await axiosInstance.post('management/keys', this.addKeyForm);
        await this.loadKeys();
        this.$buefy.toast.open({
          message: 'Key successfully added',
          type: 'is-success'
        });
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in adding new key',
          type: 'is-danger'
        });
      }
    },
    getFormElement(id: string) {
      return document.getElementById(id) as HTMLFormElement
    }
  }
});
</script>
