<template>
  <div>
    <div class="card" v-if="manager">
      <div class="card-header">
        <p class="card-header-title">Configured contexts</p>
      </div>
      <div class="card-content">
        <b-table :data="config?.contexts" detailed detail-key="id">
          <b-table-column field="id" label="ID" v-slot="props">
            {{ props.row.id  }}
          </b-table-column>
          <b-table-column field="credentialType" label="Credential Type" v-slot="props">
            <code>{{ props.row.credentialType  }}</code>
          </b-table-column>
          <b-table-column field="issuable" label="Issuable" v-slot="props">
            <b-icon v-if="props.row.issuable" icon="check-bold" type="is-success" />
            <b-icon v-else icon="close-thick" type="is-danger" />
          </b-table-column>
          <b-table-column field="schema" label="Schema" v-slot="props">
            <b-icon v-if="props.row.schema" icon="check-bold" type="is-success" />
            <b-icon v-else icon="close-thick" type="is-danger" />
          </b-table-column>
          <b-table-column field="actions" label="Actions" v-slot="props">
            <div class="buttons">
                <b-button type="is-success" @click="useContext(props.row)">Use</b-button>
              </div>
          </b-table-column>

          <template #detail="props">
            <h3 class="subtitle">JSON-LD Context</h3>
            <template v-if="props.row.document">
              <b-collapse :open="false" aria-id="contextjsonld" class="mt-4">
              <template #trigger="props">
                <b-button 
                  :label="(props.open) ? 'Hide JSON-LD context' : 'Show JSON-LD context'"
                  type="is-primary" 
                  aria-controls="contextjsonld" 
                  :aria-expanded="props.open" />
              </template>
              <code-highlight :code="props.row.document" />
            </b-collapse>
            </template>
            <p v-else>-</p>
            <h3 class="subtitle">JSON Schema</h3>
            <template v-if="props.row.schema">
              <b-collapse :open="false" aria-id="schemajson" class="mt-4">
              <template #trigger="props">
                <b-button 
                  :label="(props.open) ? 'Hide JSON schema' : 'Show JSON schema'"
                  type="is-primary" 
                  aria-controls="schemajson" 
                  :aria-expanded="props.open" />
              </template>
              <code-highlight :code="props.row.schema" />
            </b-collapse>
            </template>
            <p v-else>-</p>
          </template>

        </b-table>
      </div>
    </div>

    <div class="card" v-if="manager">
      <div class="card-header">
        <p class="card-header-title">Issue credential</p>
      </div>
      <div class="card-content">
        <form id="issueCredential" @submit.prevent="issueCredential">
          <b-field label="Contexts">
            <b-taginput
                v-model="issueCredentialForm.context"
                ellipsis
                :data="issuableContexts"
                :allow-new="true"
                :open-on-focus="true"
                autocomplete
                icon="label"
                placeholder="(Optionally) Add a JSON-LD context"
                aria-close-label="Delete context">
            </b-taginput>
          </b-field>
          <b-field label="Type">
            <b-taginput
                v-model="issueCredentialForm.type"
                ellipsis
                :data="issuableCredentialTypes"
                :allow-new="true"
                :open-on-focus="true"
                icon="label"
                placeholder="Add a Credential type (only if not explicit in credential subject)"
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
                :value="`${issueCredentialForm.targetDid}#${encodeURIComponent(issueCredentialForm.id)}`"
                :disabled="true"
                />
          </b-field>
          <b-field label="Credential"
            :type="(issueCredentialForm.credentialValidation) ? 'is-danger' : ''"
            :message="issueCredentialForm.credentialValidation"
            v-if="!issueCredentialForm.schema || issueCredentialForm.manualCredential"
            >
            <div>
            <b-input 
              v-model="issueCredentialForm.credentialSubject" 
              type="textarea"
              class="is-family-monospace"
              rows="10"
              @blur="validateCredentialSubject(false)"
              ></b-input>
              <b-button type="is-info" class="m-3" v-if="issueCredentialForm.schema" @click="() => {issueCredentialForm.manualCredential = !issueCredentialForm.manualCredential}">Credential form</b-button>
            </div>
          </b-field>
          <b-field label="Credential form" v-if="issueCredentialForm.schema && !issueCredentialForm.manualCredential">
            <div>
              <JsonSchemaFormElement v-for="(child, key) in issueCredentialForm.schema.properties" :schema="child" :key="key" :required="issueCredentialForm.schema.required.includes(key)" :name="key" :didId="didId" @input="($event) => {issueCredentialForm.credentialSubjectObject[key] = $event; updateCredentialSubject();}"></JsonSchemaFormElement>
              <b-button type="is-warning" class="m-3" @click="() => {issueCredentialForm.manualCredential = !issueCredentialForm.manualCredential}">Manual credential</b-button>
            </div>
          </b-field>
          <b-field>
            <b-button type="is-primary" @click="issueCredential">Issue credential</b-button>
          </b-field>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import store, { axiosInstance } from '../../store';
import Vue from 'vue';
import JsonSchemaFormElement from '../../components/JsonSchemaFormElement.vue';
import { CredentialConfig, JsonLdContextConfig } from '../../model/credentials';
import { AppRole } from '../../model/clients';
import Ajv, {JSONSchemaType} from "ajv";
import axios from 'axios';

export default Vue.extend({
  name: 'IssueCredentialsView',
  components: {
    JsonSchemaFormElement
  },
  data(): {
    config: CredentialConfig | undefined,
    issueCredentialForm: {
      context: string[],
      type: string[],
      targetDid: string,
      id: string,
      keyId?: string,
      credentialSubject: string,
      credentialSubjectObject: Record<string, any>,
      manualCredential: boolean,
      credentialValidation: string | undefined,
      schema: Record<string, any> | undefined
    },
  } {
    return {
      config: undefined,
      issueCredentialForm: {
        context: [],
        type: [],
        targetDid: store.state.client_info?.didId || '',
        id: '',
        keyId: undefined,
        credentialSubject: JSON.stringify({
          id: store.state.client_info?.didId || '',
        }, null, 2),
        credentialSubjectObject: {},
        manualCredential: false,
        credentialValidation: undefined,
        schema: undefined
      },
    }
  },
  computed: {
    didId() {
      return store.state.client_info?.didId;
    },
    issuableContexts() {
      return this.config?.contexts?.filter(c => c.issuable)?.map(c => c.documentUrl)
    },
    issuableCredentialTypes() {
      return this.config?.contexts?.filter(c => c.issuable)?.map(c => c.credentialType)
    },
    manager() {
      return store.state.client_info?.roles.includes(AppRole.MANAGE_OWN_CREDENTIALS) || store.state.client_info?.roles.includes(AppRole.MANAGE_ALL_CREDENTIALS) || false
    },
  },
  async created() {
    await this.loadConfig();
  },
  methods: {
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
        this.$buefy.snackbar.open({
          message: 'Credential successfully issued',
          duration: 10000,
          type: 'is-success',
          actionText: 'Go to credential',
          cancelText: 'Ok',
          onAction: () => {
            this.$router.push({path: '/credentials'});
          }
        });
        this.issueCredentialForm = {
          context: [],
          type: [],
          targetDid: store.state.client_info?.didId || '',
          id: '',
          keyId: undefined,
          credentialSubject: JSON.stringify({
            id: store.state.client_info?.didId || '',
          }, null, 2),
          credentialSubjectObject: {},
          manualCredential: false,
          credentialValidation: undefined,
          schema: undefined
        }
      } catch (err) {
        this.$buefy.toast.open({
          message: 'Error in issuing new credential',
          type: 'is-danger'
        });
      }
    },
    useContext(context: JsonLdContextConfig) {
      this.issueCredentialForm.context = [...new Set([...this.issueCredentialForm.context, (context.documentUrl || '')])]
      this.issueCredentialForm.schema = context.schema;
      if (!context.schema?.properties?.type && !context.schema?.properties?.['@type']) {
        this.issueCredentialForm.type = [...new Set([...this.issueCredentialForm.type, context.credentialType])]
      }
    },
    updateCredentialSubject() {
      this.issueCredentialForm.credentialSubject = JSON.stringify(this.issueCredentialForm.credentialSubjectObject, null, 2)
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

        const contexts: JsonLdContextConfig[] = this.config?.contexts?.filter(c => this.issueCredentialForm.type.includes(c.credentialType)) || []
        for (const context of contexts) {
          if (context.schema) {
            const ajv = new Ajv({allErrors: true});
            const schema = context.schema as JSONSchemaType<any>;
            const validate = ajv.compile(schema);
            if (!validate(credentialSubject)) {
              console.log(`Validation of context ${context.id} error: ${JSON.stringify(validate.errors)}`)
              throw Error('Credential schema validation errors: ' + validate.errors?.map(e => e.message).join(", "))
            }
          }
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
    getFormElement(id: string) {
      return document.getElementById(id) as HTMLFormElement
    }
  }
});
</script>