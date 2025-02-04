<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "primevue/usetoast";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import schema from "@tsg-dsp/common-ui/assets/presentation-definition.schema.json";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import http from "@tsg-dsp/common-ui/utils/http";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

const toast = useToast();
const userStore = useUserStore();

const holderForm = ref<{
  audience: string;
  scope: string;
}>({
  audience: userStore.user?.didId || "",
  scope: ""
});
const holderIdToken = ref<string>();

const verifierForm = ref<{
  holderIDToken: string;
  presentationDefinition: string;
}>({
  holderIDToken: "",
  presentationDefinition: JSON.stringify(
    {
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
                  pattern: "VerifiableCredential"
                }
              }
            ]
          }
        }
      ]
    },
    null,
    2
  )
});

const verifierResponse = ref<{
  success: boolean;
  body: string;
  code?: number;
}>();

const requestHolderIDToken = async () => {
  try {
    const response = await http<{ id_token: string }>(
      "management/dcp/holder/token",
      {
        params: {
          audience: holderForm.value.audience,
          scope:
            holderForm.value.scope.trim() === ""
              ? undefined
              : holderForm.value.scope
        }
      }
    );
    holderIdToken.value = response.data.id_token;
    if (holderForm.value.audience === userStore.user?.didId) {
      verifierForm.value.holderIDToken = response.data.id_token;
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not create ID token",
        defaultMessage: `Could not create ID token for ${holderForm.value.audience}`
      })
    );
  }
};

const requestVerification = async () => {
  verifierResponse.value = undefined;
  try {
    const response = await http.post<VerifiablePresentation>(
      "management/dcp/verifier/verify",
      {
        holderIdToken: verifierForm.value.holderIDToken,
        presentationDefinition: JSON.parse(
          verifierForm.value.presentationDefinition
        )
      }
    );
    verifierResponse.value = {
      success: true,
      body: JSON.stringify(response.data, null, 2)
    };
  } catch (error) {
    if (error.response) {
      verifierResponse.value = {
        success: false,
        body: JSON.stringify(error.response.data, null, 2),
        code: error.response.status
      };
    } else {
      toast.add(
        toastError({
          error,
          summary: "Could not request verification",
          defaultMessage: `Error in requesting verification of presentation definition`
        })
      );
    }
  }
};

const copyToken = (token: string) => {
  navigator.clipboard.writeText(token);
  toast.add({
    severity: "success",
    summary: "Copied",
    detail: "Copied token to clipboard",
    life: 3000
  });
};
</script>

<template>
  <div>
    <Card>
      <template #title>Presentation exchange</template>
      <template #subtitle>
        <p>
          This page allows you to manually test the presentation exchange both
          as holder and verifier. The protocol relies on the
          <a
            href="https://openid.net/specs/openid-connect-self-issued-v2-1_0.html"
            >Self-Issued OpenID Provider</a
          >
          specification and the
          <a
            href="https://identity.foundation/presentation-exchange/spec/v2.0.0/"
            >Presentation Exchange</a
          >
          specification.
        </p>
      </template>
    </Card>
    <Card class="mt-8">
      <template #title>DCP Holder</template>
      <template #subtitle>
        <p>
          As holder of credentials, you are required to request a token that the
          verifier can use to request the required Verifiable Credentials in a
          Verifiable Presentation.
        </p>
        <p>
          You are required to provide the DID identifier of the verifier in the
          form, with optionally a scope to restrict access to specific
          credentials.
        </p>
        <p>
          The resulting token should be shared with the verifier. If used
          combined with a TSG Control Plane, the Control Plane automatically
          shares the token with the remote party. For this manual presentation
          request, you should share the ID token out-of-band with the verifier.
        </p>
        <Message :closable="false"
          >Scope restriction is currently not supported by the TSG Wallet, each
          ID token provides viewing access to all credentials in the
          Wallet.</Message
        >
      </template>
      <template #content>
        <form
          class="flex flex-col gap-4"
          @submit.prevent="requestHolderIDToken">
          <FormField label="Audience" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="holderForm.audience" />
          </FormField>
          <FormField label="Bearer scope" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="holderForm.scope" />
          </FormField>
          <FormField no-label>
            <Button label="Request ID token" type="submit" />
          </FormField>
        </form>
        <Panel v-if="holderIdToken" header="ID Token">
          <pre style="white-space: pre-wrap; overflow-wrap: anywhere">{{
            holderIdToken
          }}</pre>

          <Button
            class="mr-2"
            label="Copy token"
            @click="copyToken(holderIdToken)" />
        </Panel>
      </template>
    </Card>
    <Card class="mt-8">
      <template #title>DCP Verifier</template>
      <template #subtitle>
        <p>
          As verifier of credentials from a holder, you need to have an ID token
          created by the holder in order to be able to request a Verifiable
          Presentation from the holder.
        </p>
        <p>
          The presentation definition specifies the requirements on the
          credentials that you want to verify. You're able to set constraints to
          ensure the right credentials are presented to you, e.g. to ensure a
          specific type of credential is presented or a credential from a
          specific issuer is presented.
        </p>
        <p>
          The presentation definition follows the
          <a
            href="https://identity.foundation/presentation-exchange/spec/v2.0.0/#presentation-definition"
            target="_blank"
            >Presentation Exchange Presentation Definition</a
          >
          specification.
        </p>
      </template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="requestVerification">
          <FormField label="Holder ID Token" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="verifierForm.holderIDToken"
              placeholder="eyJhb..." />
          </FormField>
          <FormField label="Presentation Definition" v-slot="props">
            <MonacoEditorVue
              v-model="verifierForm.presentationDefinition"
              :schema="schema"
              :min-lines="3"
              :max-lines="30"></MonacoEditorVue>
          </FormField>
          <FormField no-label>
            <Button label="Request presentation" type="submit" />
          </FormField>
        </form>
        <Panel v-if="verifierResponse" header="Verifier response">
          <FormField label="Status">{{
            verifierResponse.success ? "Success" : "Error"
          }}</FormField>
          <FormField label="Code" v-if="verifierResponse.code">{{
            verifierResponse.code
          }}</FormField>
          <MonacoEditorVue
            :static="verifierResponse.body"
            :read-only="true"
            :max-lines="100" />
        </Panel>
      </template>
    </Card>
  </div>
</template>
