<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from "primevue/usetoast";
import { axiosInstance, store } from "../store/index.js";
import FormField from "../components/FormField.vue";
import { CredentialSubject, VerifiableCredential, VerifiablePresentation } from '@tsg-dsp/common';

const toast = useToast();

const holderForm = ref<{
  audience: string;
  scope: string;
}>({
  audience: store.state.client_info?.didId || "",
  scope: ""
});
const holderIdToken = ref<string>();

const verifierForm = ref<{
  holderIDToken: string;
  presentationDefinition: string;
}>({
  holderIDToken: "",
  presentationDefinition: JSON.stringify({
    id: crypto.randomUUID(),
    input_descriptors: [
      {
        id: crypto.randomUUID(),
        constraints: {
          fields: [
            {
              path: ["$.type"],
              filter: {
                type: "string",
                pattern: "VerifiableCredential",
              },
            },
          ],
        },
      },
    ],
  }, null, 2)
});

const verifierResponse = ref<{
  success: boolean,
  body: string,
  code?: number
}>()

const requestHolderIDToken = async () => {
  try {
    const response = await axiosInstance<{id_token: string}>("iatp/holder/token", {
      params: {
        audience: holderForm.value.audience,
        scope: (holderForm.value.scope.trim() === "") ? undefined : holderForm.value.scope
      }
    });
    holderIdToken.value = response.data.id_token;
    if (holderForm.value.audience === store.state.client_info?.didId) {
      verifierForm.value.holderIDToken = response.data.id_token;
    }
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not create ID token",
      life: 10000,
    });
  }
}

const requestVerification = async () => {
  try {
    const response = await axiosInstance.post<VerifiablePresentation<VerifiableCredential<CredentialSubject>>>("iatp/verifier/verify", {
      holderIdToken: verifierForm.value.holderIDToken,
      presentationDefinition: JSON.parse(verifierForm.value.presentationDefinition)
    });
    verifierResponse.value = {
      success: true,
      body: JSON.stringify(response.data, null, 2)
    }
  } catch (err) {
    if (err.response) {
      verifierResponse.value = {
        success: false,
        body: JSON.stringify(err.response.data, null, 2),
        code: err.response.status
      }
    } else {
      toast.add({
        severity: "warn",
        summary: "API error",
        detail: "Could not request verification",
        life: 10000,
      });
    }
  }
}

const copyToken = (token: string) => {
  navigator.clipboard.writeText(token);
  toast.add({
    severity: "success",
    summary: "Copied",
    detail: "Copied token to clipboard",
    life: 3000,
  });
}

</script>

<template>
  <div>
    <Card>
      <template #title>IATP Holder</template>
      <template #subtitle>Request a holder ID token for exchange with verifier</template>
      <template #content>
        <form @submit.prevent="requestHolderIDToken">
          <FormField label="Audience" v-slot="props">
            <InputText :id="props.id" class="w-full" v-model="holderForm.audience" />
          </FormField>
          <FormField label="Bearer scope" v-slot="props">
            <InputText :id="props.id" class="w-full" v-model="holderForm.scope" />
          </FormField>
          <FormField no-label>
            <Button label="Request ID token" type="submit" />
          </FormField>
        </form>
        <Panel v-if="holderIdToken" header="ID Token">
          <pre style="white-space: pre-wrap; overflow-wrap: anywhere;">{{ holderIdToken }}</pre>

          <Button
            class="mr-2"
            label="Copy token"
            @click="copyToken(holderIdToken)"
          />
        </Panel>
      </template>
    </Card>
    <Card class="mt-5">
      <template #title>IATP Verifier</template>
      <template #subtitle>Request a Verifiable Presentation from a holder</template>
      <template #content>
        <form @submit.prevent="requestVerification">
          <FormField label="Holder ID Token" v-slot="props">
            <InputText :id="props.id" class="w-full" v-model="verifierForm.holderIDToken" />
          </FormField>
          <FormField label="Presentation Definition" v-slot="props">
            <Textarea
              :id="props.id"
              class="w-full"
              style="font-family: monospace"
              v-model="verifierForm.presentationDefinition"
              rows="22"
            />
          </FormField>
          <FormField no-label>
            <Button label="Request presentation" type="submit" />
          </FormField>
        </form>
        <Panel v-if="verifierResponse" header="Verifier response">
          <FormField label="Status">{{ (verifierResponse.success) ? "Success" : "Error" }}</FormField>
          <FormField label="Code" v-if="verifierResponse.code">{{ verifierResponse.code }}</FormField>
          <pre style="white-space: pre-wrap; overflow-wrap: anywhere;">{{ verifierResponse.body }}</pre>
          <JsonSchemaFormElement></JsonSchemaFormElement>
          <Button
            class="mr-2"
            label="Copy token"
            @click="copyToken(holderIdToken)"
          />
        </Panel>
      </template>
    </Card>
  </div>
</template>