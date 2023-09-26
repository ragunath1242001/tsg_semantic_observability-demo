<template>
  <div>

    <div class="card" v-if="manager">
      <div class="card-header">
        <p class="card-header-title">Gaia-X Legal Registration Number</p>
      </div>
      <div class="card-content">
        <form id="legalRegistrationNumber" @submit.prevent="importLRNCredential">
          <b-field horizontal label="Legal registration number type">
            <b-radio v-model="legalRegistrationNumberForm.type" name="type" native-value="taxID">taxID</b-radio>
            <b-radio v-model="legalRegistrationNumberForm.type" name="type" native-value="EUID">EUID</b-radio>
            <b-radio v-model="legalRegistrationNumberForm.type" name="type" native-value="EORI">EORI</b-radio>
            <b-radio v-model="legalRegistrationNumberForm.type" name="type" native-value="vatID">vatID</b-radio>
            <b-radio v-model="legalRegistrationNumberForm.type" name="type" native-value="leiCode">leiCode</b-radio>
          </b-field>
          <b-field horizontal label="Legal registration number">
            <b-input      v-if="legalRegistrationNumberForm.type === 'taxID'"   type="text" pattern="^\d{2}-\d{7}$" v-model="legalRegistrationNumberForm.value" validation-message="Provide a correct taxID (pattern: \d{2}-\d{7})" required />
            <b-input v-else-if="legalRegistrationNumberForm.type === 'EUID'"    type="text" pattern="^[A-Z]{2}\d{2}[A-Z0-9]{1,15}$" v-model="legalRegistrationNumberForm.value" validation-message="Provide a correct EUID (pattern: [A-Z]{2}\d{2}[A-Z0-9]{1,15})" required />
            <b-input v-else-if="legalRegistrationNumberForm.type === 'EORI'"    type="text" pattern="^[A-Z]{2}[A-Z0-9]{1,15}$" v-model="legalRegistrationNumberForm.value" validation-message="Provide a correct EORI (pattern: [A-Z]{2}[A-Z0-9]{1,15})" required />
            <b-input v-else-if="legalRegistrationNumberForm.type === 'vatID'"   type="text" pattern="^[A-Z]{2}[A-Z0-9]{2,15}$" v-model="legalRegistrationNumberForm.value" validation-message="Provide a correct vatId (pattern: [A-Z]{2}[A-Z0-9]{2,15})" required />
            <b-input v-else-if="legalRegistrationNumberForm.type === 'leiCode'" type="text" pattern="^[A-Z0-9]{20}$" v-model="legalRegistrationNumberForm.value" validation-message="Provide a correct leiCode (pattern: [A-Z0-9]{20})" required />
            <b-input v-else type="text" disabled required />
          </b-field>
          <b-field horizontal label="Target DID">
            <b-input 
                v-model="legalRegistrationNumberForm.targetDid"
                placeholder='did:web:...'
                pattern='did:web:.*'
                validation-message="Target DID must be a DID web"
                required
                />
          </b-field>
          <b-field horizontal label="ID">
            <b-input 
                v-model="legalRegistrationNumberForm.id"
                placeholder="ID"
                required
                />
          </b-field>
          <b-field horizontal label="Composite ID">
            <b-input 
                :value="`${legalRegistrationNumberForm.targetDid}#${encodeURIComponent(legalRegistrationNumberForm.id)}`"
                :disabled="true"
                />
          </b-field>
          <b-field horizontal label="Clearing house">
            <b-autocomplete
                v-model="legalRegistrationNumberForm.clearingHouse"
                :data="legalRegistrationNumberForm.clearingHouses">
            </b-autocomplete>
          </b-field>
          <b-field horizontal>
            <b-button type="is-primary" @click="importLRNCredential">Request and import Legal Registration Number credential</b-button>
          </b-field>
        </form>
      </div>
    </div>
    <div class="card" v-if="manager">
      <div class="card-header">
        <p class="card-header-title">Gaia-X Compliance</p>
      </div>
      <div class="card-content">
        <form id="complianceCredential" @submit.prevent="importComplianceCredential">
          <b-field horizontal label="Credentials">
            <b-select
                multiple
                :native-size="Math.min(5, (credentials || ['']).length)"
                v-model="complianceCredentialForm.credentials">
              <option v-for="credential in credentials" :key="credential.id" :value="credential.credential">{{ credential.id }} ({{ retrieveCredentialTypes(credential).join(', ') }})</option>
            </b-select>
          </b-field>
          <b-field horizontal label="Target DID">
            <b-input 
                v-model="complianceCredentialForm.targetDid"
                placeholder='did:web:...'
                pattern='did:web:.*'
                validation-message="Target DID must be a DID web"
                required
                />
          </b-field>
          <b-field horizontal label="ID">
            <b-input 
                v-model="complianceCredentialForm.id"
                placeholder="ID"
                required
                />
          </b-field>
          <b-field horizontal label="Composite ID">
            <b-input 
                :value="`${complianceCredentialForm.targetDid}#${encodeURIComponent(complianceCredentialForm.id)}`"
                :disabled="true"
                />
          </b-field>
          <b-field horizontal label="Clearing house">
            <b-autocomplete
                v-model="complianceCredentialForm.clearingHouse"
                :data="complianceCredentialForm.clearingHouses">
            </b-autocomplete>
          </b-field>
          <b-field horizontal>
            <b-button type="is-primary" @click="importComplianceCredential">Request and import Compliance credential</b-button>
          </b-field>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import store, { axiosInstance } from '../../store';
import Vue from 'vue';
import { CredentialSubject, Credentials, VerifiableCredential } from '../../model/credentials';
import { AppRole } from '../../model/clients';

export default Vue.extend({
  name: 'GaiaXCredentialsView',
  data(): {
    credentials: Credentials[] | undefined,
    legalRegistrationNumberForm: {
      type: string | undefined
      value: string | undefined
      targetDid: string,
      id: string,
      clearingHouse: string,
      clearingHouses: string[]
    },
    complianceCredentialForm: {
      targetDid: string,
      id: string,
      credentials: VerifiableCredential<CredentialSubject>[],
      clearingHouse: string,
      clearingHouses: string[]
    }
  } {
    return {
      credentials: undefined,
      legalRegistrationNumberForm: {
        type: undefined,
        value: undefined,
        targetDid: store.state.client_info?.didId || '',
        id: 'LRNCredential',
        clearingHouse: 'registrationnumber.notary.gaia-x.eu/v1',
        clearingHouses: ['registrationnumber.notary.gaia-x.eu/v1']
      },
      complianceCredentialForm: {
        targetDid: store.state.client_info?.didId || '',
        id: 'ComplianceCredential',
        credentials: [],
        clearingHouse: 'compliance.gaia-x.eu/development',
        clearingHouses: ['compliance.gaia-x.eu/development', 'compliance.gaia-x.eu/v1']
      }
    }
  },
  computed: {
    didId() {
      return store.state.client_info?.didId;
    },
    manager() {
      return store.state.client_info?.roles.includes(AppRole.MANAGE_OWN_CREDENTIALS) || store.state.client_info?.roles.includes(AppRole.MANAGE_ALL_CREDENTIALS) || false
    },
  },
  async created() {
    await this.loadCredentials();
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
    async importLRNCredential() {
      try {
        const property = `gx:${this.legalRegistrationNumberForm.type}`
        const credential = {
          '@context': ['https://registry.lab.gaia-x.eu/development/api/trusted-shape-registry/v1/shapes/jsonld/participant'],
          'type': 'gx:legalRegistrationNumber',
          'id': this.legalRegistrationNumberForm.targetDid,
          [property]: this.legalRegistrationNumberForm.value
        }
        await axiosInstance.post('management/credentials/gaiax/legalRegistrationNumber', {
          vcId: `${this.legalRegistrationNumberForm.targetDid}#${encodeURIComponent(this.legalRegistrationNumberForm.id)}`,
          clearingHouse: this.legalRegistrationNumberForm.clearingHouse,
          credentialSubject: credential
        });
        await this.loadCredentials();
        this.$buefy.toast.open({
          message: 'Legal Registration Number credential successfully requested',
          type: 'is-success'
        });
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error requesting Legal Registration Number credential',
          type: 'is-danger'
        });
      }
    },
    async importComplianceCredential() {
      try {
        await axiosInstance.post('management/credentials/gaiax/compliance', {
          vcId: `${this.complianceCredentialForm.targetDid}#${encodeURIComponent(this.complianceCredentialForm.id)}`,
          clearingHouse: this.complianceCredentialForm.clearingHouse,
          credentials: this.complianceCredentialForm.credentials
        })
        await this.loadCredentials();
        this.$buefy.toast.open({
          message: 'Compliance credential successfully requested',
          type: 'is-success'
        });
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error requesting Compliance credential',
          type: 'is-danger'
        });
      }
    },
  }
});
</script>