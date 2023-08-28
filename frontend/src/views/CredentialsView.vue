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
          <!-- <b-table-column field="issuer" label="Issuer" v-slot="props">
            <code>{{ props.row.credential.issuer  }}</code>
          </b-table-column> -->
          <b-table-column field="type" label="Type" v-slot="props">
            <b-taglist>
              <b-tag v-for="(credentialType, id) in props.row.credential.type" :key="`${props.row.id}-${id}`">{{ credentialType.split(/[/#]/g).slice(-1)[0] }}</b-tag>
            </b-taglist>
          </b-table-column>
          <b-table-column field="expirationDate" label="Expiration" v-slot="props">
            {{ formatDate(props.row.credential.expirationDate)  }}
          </b-table-column>
          <b-table-column field="actions" label="Actions" v-slot="props">
            <div class="buttons">
                <b-button type="is-danger" icon-right="delete" @click="deleteCredential(props.row.id)"></b-button>
              </div>
          </b-table-column>
          
          <template #detail="props">
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


    <div class="card">
      <div class="card-header">
        <p class="card-header-title">Issue credential</p>
      </div>
      <div class="card-content">
        <form id="issueCredential" @submit.prevent="issueCredential">
          <b-field label="Contexts">
            <b-taginput
                v-model="issueCredentialForm.context"
                ellipsis
                icon="label"
                placeholder="(Optionally) Add a JSON-LD context"
                aria-close-label="Delete context">
            </b-taginput>
          </b-field>
          <b-field label="Type">
            <b-taginput
                v-model="issueCredentialForm.type"
                ellipsis
                icon="label"
                placeholder="Add a Credential type"
                aria-close-label="Delete credential type">
            </b-taginput>
          </b-field>
          <b-field label="Target DID">
            <b-input 
                v-model="issueCredentialForm.targetDid"
                placeholder='did:web:...'
                pattern='did:web:.*'
                validation-message="Target DID must be a DID web"
                required
                />
          </b-field>
          <b-field label="ID">
            <b-input 
                v-model="issueCredentialForm.id"
                placeholder="ID"
                required
                />
          </b-field>
          <b-field label="Composite ID">
            <b-input 
                v-model="compositeId"
                :disabled="true"
                />
          </b-field>
          <b-field label="Credential"
            :type="(issueCredentialForm.credentialValidation) ? 'is-danger' : ''"
            :message="issueCredentialForm.credentialValidation"
            >
            <b-input 
              v-model="issueCredentialForm.credentialSubject" 
              type="textarea"
              class="is-family-monospace"
              @blur="validateCredentialSubject(false)"
              ></b-input>
          </b-field>
          <b-field horizontal>
            <b-button type="is-primary" @click="issueCredential">Issue credential</b-button>
          </b-field>
        </form>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <p class="card-header-title">Import credential</p>
      </div>
      <div class="card-content">
        <form id="addKey" @submit.prevent="importCredential">
          <b-field label="Credential"
            :type="(importCredentialForm.credentialValidation) ? 'is-danger' : ''"
            :message="importCredentialForm.credentialValidation"
            >
            <b-input 
              v-model="importCredentialForm.credential" 
              type="textarea"
              class="is-family-monospace"
              @blur="validateCredential(false)"
              ></b-input>
          </b-field>
          <b-field horizontal>
            <b-button type="is-primary" @click="importCredential">Import credential</b-button>
          </b-field>
        </form>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import store, { axiosInstance } from '@/store';
import Vue from 'vue';
import CodeHighlight from '../components/CodeHighlight.vue';
import { Credentials } from '../model/credentials';

export default Vue.extend({
  name: 'CredentialsView',
  components: {
    CodeHighlight
  },
  data(): {
    credentials: Credentials[] | undefined,
    issueCredentialForm: {
      context: string[],
      type: string[],
      targetDid: string,
      id: string,
      keyId?: string,
      credentialSubject: string,
      credentialValidation: string | undefined
    },
    importCredentialForm: {
      credential: string,
      credentialValidation: string | undefined
    }
  } {
    return {
      credentials: undefined,
      issueCredentialForm: {
        context: [],
        type: [],
        targetDid: store.state.client_info?.didId || '',
        id: '',
        keyId: undefined,
        credentialSubject: JSON.stringify({
          id: store.state.client_info?.didId || '',
        }, null, 2),
        credentialValidation: undefined
      },
      importCredentialForm: {
        credential: '{}',
        credentialValidation: undefined
      }
    }
  },
  async created() {
    await this.loadCredentials();
  },
  computed: {
    compositeId() {
      return `${this.issueCredentialForm.targetDid}#${encodeURIComponent(this.issueCredentialForm.id)}`
    }
  },
  methods: {
    async loadCredentials() {
      const response = await axiosInstance<Credentials[]>('management/credentials');
      this.credentials = response.data;
    },
    validateCredentialSubject(toast: boolean): any | null {
      try {
        let credentialSubject;
        try {
          credentialSubject = JSON.parse(this.issueCredentialForm.credentialSubject);
        } catch (err) {
          throw Error('Credential subject must be a valid JSON document');
        }
        if (typeof credentialSubject !== "object" ){
          throw Error('Credential subject must be a valid JSON object')
        }
        if (!credentialSubject['id']
          || typeof credentialSubject['id'] !== 'string'
          || !credentialSubject['id'].startsWith('did:web:')
          || credentialSubject['id'] !== this.issueCredentialForm.targetDid
          ) {
            throw Error('Credential subject must contain an identifier pointing to the target DID')
        }

        if (!toast) {
          this.issueCredentialForm.credentialValidation = undefined;
        }
        return credentialSubject;
      } catch (e) {
        const errorMessage = (e as Error).message
        if (toast) {
          this.$buefy.toast.open({
            message: errorMessage,
            type: 'is-danger'
          });
        } else {
          this.issueCredentialForm.credentialValidation = errorMessage;
        }
        return null;
      }

    },
    async issueCredential() {
      if (!this.getFormElement('issueCredential').checkValidity()){
        this.$buefy.toast.open({
          message: 'Please fill all required fields',
          duration: 10000,
          type: 'is-warning',
        });
        return;
      }
      const credentialSubject = this.validateCredentialSubject(true);
      if (!credentialSubject) return;
      
      const credentialConfig = {
        context: this.issueCredentialForm.context,
        type: this.issueCredentialForm.type,
        targetDid: this.issueCredentialForm.targetDid,
        id: encodeURIComponent(this.issueCredentialForm.id),
        credentialSubject: credentialSubject
      }
      try {
        await axiosInstance.post('management/credentials', credentialConfig);
        await this.loadCredentials();
        this.issueCredentialForm = {
          context: [],
          type: [],
          targetDid: store.state.client_info?.didId || '',
          id: '',
          keyId: undefined,
          credentialSubject: JSON.stringify({
            id: store.state.client_info?.didId || '',
          }, null, 2),
          credentialValidation: undefined
        }
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in issuing new credential',
          type: 'is-danger'
        });
      }
    },
    validateCredential(toast: boolean) {
      try {
        let credential;
        try {
          credential = JSON.parse(this.importCredentialForm.credential);
        } catch (err) {
          throw Error('Credential subject must be a valid JSON document');
        }
        if (typeof credential !== "object" ){
          throw Error('Credential subject must be a valid JSON object')
        }
        if (!credential['id']
          || typeof credential['id'] !== 'string') {
            throw Error('Credential id must be present and be a string')
        }
        if (!credential['issuer']
          || typeof credential['issuer'] !== 'string'
          || !credential['issuer'].startsWith('did:web:')) {
            throw Error('Credential issuer must be present and be a string and start with did:web:')
        }
        if (!credential['credentialSubject']
          || typeof credential['credentialSubject'] !== 'object'
          || !credential['credentialSubject']['id']
          || typeof credential['credentialSubject']['id'] !== 'string'
          || !credential['credentialSubject']['id'].startsWith('did:web:')
          ) {
            throw Error('Credential subject must be present and be an object containing at least an id starting with did:web:')
        }

        if (!toast) {
          this.importCredentialForm.credentialValidation = undefined;
        }
        return credential;
      } catch (e) {
        const errorMessage = (e as Error).message
        if (toast) {
          this.$buefy.toast.open({
            message: errorMessage,
            type: 'is-danger'
          });
        } else {
          this.importCredentialForm.credentialValidation = errorMessage;
        }
        return null;
      }
    },
    async importCredential() {
      const credential = this.validateCredential(true);
      if (!credential) return;

      try {
        await axiosInstance.post('management/credentials/import', credential);
        await this.loadCredentials();
        this.importCredentialForm = {
          credential: '{}',
          credentialValidation: undefined
        }
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in importing credential',
          type: 'is-danger'
        });
      }
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
    formatDate(dateString: string) {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    },
    getFormElement(id: string) {
      return document.getElementById(id) as HTMLFormElement
    }
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