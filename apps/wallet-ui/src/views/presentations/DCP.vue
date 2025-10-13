<script setup lang="ts">
import {
  Credential,
  DataIntegrityProof,
  toArray,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import { VerificationRequest } from "@tsg-dsp/common-dtos";
import schema from "@tsg-dsp/common-ui/assets/presentation-definition.schema.json";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { ScopeDto } from "@tsg-dsp/wallet-dtos";
import dayjs from "dayjs";
import { InputGroup, InputGroupAddon } from "primevue";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

const toast = useToast();
const userStore = useUserStore();

const selectedCredentials = ref<string[]>([]);
const credentials = ref<CredentialOverviewDto[]>([]);
const scopes = ref<ScopeDto[]>([]);
const scopeString = computed(() =>
  selectedCredentials.value
    .map((s) => `org.eclipse.dspace.dcp.vc.id:${encodeURIComponent(s)}`)
    .join(" ")
);
const scopePlaceholder = ref();

interface CredentialDto {
  id: string;
  targetDid: string;
  credential: Credential;
  proof?: DataIntegrityProof;
  jwt?: string;
  selfIssued: boolean;
}

interface CredentialOverviewDto {
  id: string;
  type: string;
  issuer: string;
  validUntil: string;
  label: string;
}

const loadCredentials = async () => {
  try {
    const response = await http<CredentialDto[]>("management/credentials", {
      params: {
        page: 1,
        per_page: 100,
        order_by: "createdDate",
        order: "DESC"
      }
    });
    credentials.value = response.data.map((item) => {
      const subjectTypes = toArray(item.credential.credentialSubject).flatMap(
        (s) => [...toArray(s.type), ...toArray(s["@type"])]
      );
      const credentialTypes = new Set([
        ...toArray(item.credential.type),
        ...subjectTypes
      ]);
      const simpleTypes = [...credentialTypes]
        .map((type) => type.split(/[/#]/g).slice(-1)[0])
        .filter((type) => type !== "VerifiableCredential");
      if (simpleTypes.length === 0) {
        simpleTypes.push("VerifiableCredential");
      }
      return {
        id: item.id,
        type: simpleTypes.join(", "),
        issuer: item.selfIssued ? "self" : item.credential.issuer,
        validUntil: dayjs(
          item.credential.validUntil ?? item.credential.expirationDate
        ).fromNow(),
        label: `${simpleTypes.join(", ")} (${item.selfIssued ? "self issued" : item.credential.issuer}) expires ${dayjs(
          item.credential.validUntil ?? item.credential.expirationDate
        ).fromNow()}`
      };
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not load credentials",
        defaultMessage: `Error in fetching credentials`
      })
    );
  }
};

const holderForm = ref<{
  audience: string;
}>({
  audience: userStore.user?.didId || ""
});
const holderIdToken = ref<string>();

const verifierForm = ref<{
  type: "scope" | "presentationDefinition";
  holderIDToken: string;
  presentationDefinition: string;
  scope: {
    alias: string;
    discriminator: string[];
    discriminatorValues: string[];
  }[];
}>({
  type: "scope",
  holderIDToken: "",
  scope: [],
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
            scopeString.value.trim() === ""
              ? undefined
              : scopeString.value.trim()
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
    const request: VerificationRequest = {
      holderIdToken: verifierForm.value.holderIDToken
    };
    if (verifierForm.value.type === "scope") {
      request.scope = verifierForm.value.scope
        .filter((s) => s.alias.trim() !== "")
        .map(
          (s) =>
            `${s.alias}:${s.discriminatorValues.map((d) => encodeURIComponent(d)).join(":")}`
        );
    } else {
      request.presentationDefinition = JSON.parse(
        verifierForm.value.presentationDefinition
      );
    }
    const response = await http.post<VerifiablePresentation>(
      "management/dcp/verifier/verify",
      request
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

const loadScopes = async () => {
  try {
    const response = await http<ScopeDto[]>("management/presentation/scopes", {
      params: {
        page: 1,
        per_page: 100,
        order_by: "alias",
        order: "ASC"
      }
    });
    scopes.value = response.data.sort((a, b) => a.alias.localeCompare(b.alias));
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not load scopes",
        defaultMessage: `Error in fetching scopes`
      })
    );
  }
};

onMounted(async () => {
  await loadCredentials();
  await loadScopes();
});
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
      </template>
      <template #content>
        <form
          class="flex flex-col gap-4"
          @submit.prevent="requestHolderIDToken">
          <FormField v-slot="props" label="Audience">
            <InputText
              :id="props.id"
              v-model="holderForm.audience"
              class="w-full" />
          </FormField>
          <FormField v-slot="props" label="Bearer scope">
            <MultiSelect
              :id="props.id"
              v-model="selectedCredentials"
              :options="credentials"
              filter
              option-label="label"
              option-value="id"
              placeholder="Select credentials to include in scope, if no selection all credentials are allowed"
              class="w-full" />
          </FormField>
          <FormField no-label>
            <Button label="Request ID token" type="submit" />
          </FormField>
        </form>
        <Panel v-if="holderIdToken" header="ID Token" class="mt-4">
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
          <FormField v-slot="props" label="Holder ID Token">
            <InputText
              :id="props.id"
              v-model="verifierForm.holderIDToken"
              class="w-full"
              placeholder="eyJhb..." />
          </FormField>
          <FormField label="Request type">
            <SelectButton
              v-model="verifierForm.type"
              :allow-empty="false"
              option-label="label"
              option-value="value"
              :options="[
                { label: 'Scope', value: 'scope' },
                {
                  label: 'Presentation Definition',
                  value: 'presentationDefinition'
                }
              ]" />
          </FormField>
          <template v-if="verifierForm.type === 'scope'">
            <FormField v-slot="props" label="Scope">
              <Select
                v-model="scopePlaceholder"
                :options="scopes"
                filter
                option-label="alias"
                placeholder="Select scope template to add"
                class="w-full"
                @change="
                  (event) => {
                    verifierForm.scope.push({
                      alias: event.value.alias,
                      discriminator: event.value.discriminator.split(':'),
                      discriminatorValues: event.value.discriminator
                        .split(':')
                        .map((v) => '')
                    });
                    scopePlaceholder = null;
                  }
                " />
              <InputGroup
                v-for="(scope, index) in verifierForm.scope"
                :id="props.id + index"
                :key="index"
                class="mt-3">
                <InputGroupAddon>{{ scope.alias }}</InputGroupAddon>
                <InputText
                  v-for="(discriminator, dIndex) in scope.discriminator"
                  :key="index + '-' + dIndex"
                  v-model="
                    verifierForm.scope[index].discriminatorValues[dIndex]
                  "
                  :placeholder="discriminator"
                  class="w-full mt-3" />
                <InputGroupAddon>
                  <Button
                    icon="pi pi-times"
                    severity="secondary"
                    @click="verifierForm.scope.splice(index, 1)" />
                </InputGroupAddon>
              </InputGroup>
            </FormField>
          </template>
          <FormField v-else label="Presentation Definition">
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
        <Panel v-if="verifierResponse" header="Verifier response" class="mt-4">
          <FormField label="Status">{{
            verifierResponse.success ? "Success" : "Error"
          }}</FormField>
          <FormField v-if="verifierResponse.code" label="Code">{{
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
