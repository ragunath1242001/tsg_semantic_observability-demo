<script setup lang="ts">
import FormField from '../../components/FormField.vue';
import { axiosInstance, store } from '../../store/index.js';
import { AppRole } from '@libs/dtos';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const toast = useToast();

const credentialRef = ref<string>('{}');
const credentialValidation = ref<string>();

const manager = computed(() =>
  store.state.client_info?.roles.includes(AppRole.MANAGE_OWN_CREDENTIALS) || store.state.client_info?.roles.includes(AppRole.MANAGE_ALL_CREDENTIALS) || false
)

const validateCredential = (showToast: boolean) => {
  try {
    let credential;
    try {
      credential = JSON.parse(credentialRef.value);
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

    if (!showToast) {
      credentialValidation.value = undefined;
    }
    return credential;
  } catch (e) {
    const errorMessage = (e as Error).message
    if (showToast) {
      toast.add({severity: 'warn', summary: 'Validation error', detail: errorMessage, life: 10000});
    } else {
      credentialValidation.value = errorMessage;
    }
    return null;
  }
}

const importCredential = async (validate = true) => {
  let credential;
  if (validate) {
    credential = validateCredential(true);
    if (!credential) return;
  } else {
    credential = JSON.parse(credentialRef.value)
  }

  try {
    await axiosInstance.post('management/credentials/import', credential);
    toast.add({severity: 'success', summary: 'Success', detail: 'Credential imported', life: 3000});
    credentialRef.value = '{}';
    credentialValidation.value = undefined;
  } catch (err) {
    toast.add({severity: 'warn', summary: 'API error', detail: 'Error in importing credential', life: 10000});
  }
}
</script>

<template>
  <div>
    <Card>
      <template #title>Import credential</template>
      <template #subtitle>Use this form to import a raw JSON credential into the wallet</template>
      <template #content>
        <form @submit.prevent="importCredential(true)">
          <FormField label="Credential" v-slot="props">
            <Textarea :id="props.id" class="w-full" style="font-family: monospace;" v-model="credentialRef" rows="10" @blur="validateCredential(false)" />
            <small class="text-yellow-400" v-if="credentialValidation">{{ credentialValidation }}</small>
          </FormField>
          <FormField no-label class="mt-5">
            <Button label="Import credential" type="submit" />
            <Button class="ml-3" severity="warning" label="Import credential without verification" @click="importCredential(false)" />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped>

</style>
