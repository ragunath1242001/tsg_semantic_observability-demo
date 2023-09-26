<template>
  <div class="card" v-if="manager">
    <div class="card-header">
      <p class="card-header-title">Import credential</p>
    </div>
    <div class="card-content">
      <form id="addKey" @submit.prevent="importCredential(true)">
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
        <b-field>
          <div class="buttons">
            <b-button type="is-primary" @click="importCredential(true)">Import credential</b-button>
            <b-button type="is-warning" @click="importCredential(false)">Import credential without verification</b-button>
          </div>
        </b-field>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import store, { axiosInstance } from '../../store';
import Vue from 'vue';
import { AppRole } from '../../model/clients';

export default Vue.extend({
  name: 'ImportCredentialsView',
  data(): {
    importCredentialForm: {
      credential: string,
      credentialValidation: string | undefined
    }
  } {
    return {
      importCredentialForm: {
        credential: '{}',
        credentialValidation: undefined
      }
    }
  },
  computed: {
    manager() {
      return store.state.client_info?.roles.includes(AppRole.MANAGE_OWN_CREDENTIALS) || store.state.client_info?.roles.includes(AppRole.MANAGE_ALL_CREDENTIALS) || false
    },
  },
  methods: {
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
          || (!credential['credentialSubject']['id']
          || typeof credential['credentialSubject']['id'] !== 'string'
          || !credential['credentialSubject']['id'].startsWith('did:web:'))
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
    async importCredential(validate: boolean = true) {
      let credential;
      if (validate) {
        credential = this.validateCredential(true);
        if (!credential) return;
      } else {
        credential = JSON.parse(this.importCredentialForm.credential)
      }

      try {
        await axiosInstance.post('management/credentials/import', credential);
        this.$buefy.snackbar.open({
          message: 'Credential successfully imported',
          duration: 10000,
          type: 'is-success',
          actionText: 'Go to credential',
          cancelText: 'Ok',
          onAction: () => {
            this.$router.push({path: '/credentials'});
          }
        });
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
  }
});
</script>