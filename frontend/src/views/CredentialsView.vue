<template>
  <div>
    <div class="card">
      <div class="card-header">
        <p class="card-header-title">Credentials</p>
      </div>
      <div class="card-content">
        <p>The current credentials registered for this Wallet instance:</p>
        <b-table 
          :data="credentials"
          detailed
          detail-key="id"
          >
          <b-table-column field="id" label="ID" v-slot="props">
            <code>{{ props.row.id.replace(`${props.row.targetDid}#`, '')  }}</code>
          </b-table-column>
          <b-table-column field="targetDid" label="Target (Issuer)" v-slot="props">
            <code>{{ props.row.targetDid  }}</code><br />
            <small v-if="props.row.targetDid !== props.row.credential.issuer"><code>({{ props.row.credential.issuer  }})</code></small>
            <small v-else><code>(self)</code></small>
          </b-table-column>
          <b-table-column field="type" label="Type" v-slot="props">
            <b-taglist>
              <b-tag v-for="(credentialType, id) in retrieveCredentialTypes(props.row)" :key="`${props.row.id}-${id}`">{{ credentialType.split(/[/#]/g).slice(-1)[0] }}</b-tag>
            </b-taglist>
          </b-table-column>
          <b-table-column field="expirationDate" label="Expiration" v-slot="props">
            {{ formatDate(props.row.credential.expirationDate)  }}
          </b-table-column>
          <b-table-column field="actions" label="Actions" v-slot="props" :visible="manager">
            <div class="buttons">
                <b-button type="is-danger" icon-right="delete" @click="deleteCredential(props.row.id)"></b-button>
              </div>
          </b-table-column>
          
          <template #detail="props">
            <div class="buttons">
              <b-button type="is-primary" @click="copyCredentialId(props.row.id)">Copy Credential ID</b-button>
              <b-button type="is-primary" @click="copyCredential(props.row.credential)">Copy Credential</b-button>
            </div>
            <h3 class="subtitle">Proof</h3>
            <b-field horizontal label="Type">{{ props.row.credential.proof.type  }}</b-field>
            <b-field horizontal label="Issuance date">{{ formatDate(props.row.credential.issuanceDate)  }}</b-field>
            <b-field horizontal label="Expiration date">{{ formatDate(props.row.credential.expirationDate)  }}</b-field>
            
            <b-field horizontal label="Created">{{ formatDate(props.row.credential.proof.created) }}</b-field>
            <b-field horizontal label="Purpose">{{ props.row.credential.proof.proofPurpose }}</b-field>
            <b-field horizontal label="Verification"><code>{{ props.row.credential.proof.verificationMethod }}</code></b-field>
            <h3 class="subtitle">Credential subject</h3>
            <code-highlight :code="props.row.credential.credentialSubject"></code-highlight>
            <h3 class="subtitle">Raw credential</h3>
            <b-collapse :open="false" :aria-id="`credentialjson${props.row.id}`" class="mt-6">
                <template #trigger="props2">
                  <b-button 
                    :label="(props2.open) ? 'Hide raw credential JSON' : 'Show raw credential JSON'"
                    type="is-primary" 
                    :aria-controls="`credentialjson${props.row.id}`" 
                    :aria-expanded="props2.open" />
                </template>
                <code-highlight :code="props.row" />
              </b-collapse>
          </template>
        </b-table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import store, { axiosInstance } from '@/store';
import Vue from 'vue';
import CodeHighlight from '../components/CodeHighlight.vue';
import { CredentialConfig, CredentialSubject, Credentials, VerifiableCredential } from '../model/credentials';
import axios from 'axios';
import { AppRole } from '@/model/clients';


export default Vue.extend({
  name: 'CredentialsView',
  components: {
    CodeHighlight,
  },
  data(): {
    credentials: Credentials[] | undefined,
    config: CredentialConfig | undefined,
  } {
    return {
      credentials: undefined,
      config: undefined,
    }
  },
  async created() {
    await this.loadCredentials();
    await this.loadConfig();
  },
  computed: {
    didId() {
      return store.state.client_info?.didId;
    },
    manager() {
      return store.state.client_info?.roles.includes(AppRole.MANAGE_OWN_CREDENTIALS) || store.state.client_info?.roles.includes(AppRole.MANAGE_ALL_CREDENTIALS) || false
    },
  },
  methods: {
    async loadCredentials() {
      const response = await axiosInstance<Credentials[]>('management/credentials');
      this.credentials = response.data;
    },
    retrieveCredentialTypes(credential: Credentials): string[] {
      const credentialSubject = this.toArray(credential.credential.credentialSubject);
      let credentialTypes = credentialSubject.flatMap(s => [...this.toArray(s.type), ...this.toArray<string>(s['@type'])]);
      
      const types = new Set([...credential.credential.type, ...credentialTypes])
      return [...types].map(type => type.split(/[/#]/g).slice(-1)[0]).filter(type => type !== 'VerifiableCredential');
    },
    toArray<T>(arrayLike: T | T[] | undefined): T[] {
      if (!arrayLike) {
        return []
      }
      if (arrayLike instanceof Array) {
        return arrayLike;
      }
      return [arrayLike];
    },
    async loadConfig() {
      const response = await axiosInstance<CredentialConfig>('management/credentials/config');
      for (const context of response.data.contexts) {
        if (!context.document && context.documentUrl) {
          const contextResponse = await axios.get(context.documentUrl);
          context.document = contextResponse.data;
        }
        if (!context.documentUrl) {
          context.documentUrl = `${document.location.protocol}//${document.location.host}/context/${context.id}`;
        }
      }
      this.config = response.data;
    },
    async deleteCredential(credentialId: string) {
      this.$buefy.dialog.confirm({
          message: 'Are you sure you want to delete this credential?',
          onConfirm: async () => {
            try {
              await axiosInstance.delete(`management/credentials/${encodeURIComponent(credentialId)}`);
              await this.loadCredentials();
              this.$buefy.toast.open({
                message: 'Deleted credential',
                type: 'is-success'
              });
            } catch (err) {
              this.$buefy.toast.open({
                message: 'Error in deleting credential',
                type: 'is-danger'
              });
            }
          }
      })
    },
    copyCredentialId(credentialId: string) {
      navigator.clipboard.writeText(credentialId);
    },
    copyCredential(credential: VerifiableCredential<CredentialSubject>) {
      navigator.clipboard.writeText(JSON.stringify(credential, null, 2));
    },
    formatDate(dateString: string | undefined) {
      if (!dateString) {
        return `-`
      }
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    },
    getFormElement(id: string) {
      return document.getElementById(id) as HTMLFormElement
    },
  }

});
</script>

<style lang="scss">
code {
  font-size: 0.75em;
}

.detail-container {
  max-width: 65vw !important;
}
.detail-container {

  .subtitle {
    margin-bottom: 0;
  }
  .subtitle:not(:first-child) {
    margin-top: 2rem;
  }
  .code-highlight {
    margin-top: -1.5rem;
  }
}
</style>