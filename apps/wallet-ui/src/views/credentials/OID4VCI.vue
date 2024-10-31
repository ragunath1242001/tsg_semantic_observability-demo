<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import {
  CredentialConfig,
  CredentialOffer,
  CredentialOfferRequest,
  CredentialOfferStatus,
  JsonLdContextConfig
} from "@tsg-dsp/wallet-dtos";
import JsonSchemaFormElement from "@tsg-dsp/common-ui/components/JsonSchemaFormElement.vue";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";
import Ajv, { JSONSchemaType } from "ajv";
import http from "@tsg-dsp/common-ui/utils/http";
import { formatDate } from "@tsg-dsp/common-ui/utils/date";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

interface OfferForm {
  holderId: string;
  credentialType?: JsonLdContextConfig;
  credentialSubject: string;
  credentialSubjectObject: Record<string, any>;
  preAuthorizedCode?: string;
  manualCredential: boolean;
  credentialValidation?: string;
}

const toast = useToast();

const offers = ref<CredentialOfferStatus[]>();
const config = ref<CredentialConfig>();
const expandedRows = ref<Array<any>>();
const issuerUrl = ref(window.location.origin);
const isIssuer = computed(() => {
  return config.value?.contexts?.some((c) => c.issuable) || false;
});

const offerDefault: OfferForm = {
  holderId: "",
  credentialType: undefined,
  credentialSubject: "",
  credentialSubjectObject: {},
  preAuthorizedCode: undefined,
  manualCredential: false
};
const offerForm = ref<OfferForm>(offerDefault);
const requestForm = ref<{ preAuthorizedCode: string; issuerUrl: string }>({
  preAuthorizedCode: "",
  issuerUrl: ""
});

const issuableCredentialTypes = computed(
  () => config.value?.contexts?.filter((c) => c.issuable) ?? []
);

const loadOffers = async () => {
  try {
    const response = await http<CredentialOfferStatus[]>("oid4vci/offer");
    offers.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not load credential offers",
        defaultMessage: `Error in fetching credential offers`
      })
    );
  }
};

const loadConfig = async () => {
  try {
    const response = await http<CredentialConfig>(
      "management/credentials/config"
    );
    config.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not load credential config",
        defaultMessage: `Error in fetching credential config`
      })
    );
  }
};

const revokeOffer = async (id: number) => {
  try {
    await http.put<CredentialOfferStatus>(`oid4vci/offer/${id}/revoke`);
    await loadOffers();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not revoke offer",
        defaultMessage: `Error in revoking credential offer`
      })
    );
  }
};

const updateCredentialSubject = () => {
  offerForm.value.credentialSubject = JSON.stringify(
    offerForm.value.credentialSubjectObject,
    null,
    2
  );
};

const validateCredentialSubject = (showToast: boolean) => {
  const didMethods: string[] = ["did:web:", "did:tdw:"];
  try {
    let credentialSubject;
    try {
      credentialSubject = JSON.parse(offerForm.value.credentialSubject);
    } catch (err) {
      throw Error("Credential subject must be a valid JSON document");
    }
    if (typeof credentialSubject !== "object") {
      throw Error("Credential subject must be a valid JSON object");
    }
    if (
      !credentialSubject["id"] ||
      typeof credentialSubject["id"] !== "string" ||
      !didMethods.some((method) =>
        credentialSubject["id"].startsWith(method)
      ) ||
      credentialSubject["id"] !== offerForm.value.holderId
    ) {
      throw Error(
        "Credential subject must contain an identifier pointing to the target DID"
      );
    }

    if (!showToast) {
      offerForm.value.credentialValidation = undefined;
    }

    const context = offerForm.value.credentialType;
    if (context?.schema) {
      const ajv = new Ajv({ allErrors: true });
      const schema = context.schema as unknown as JSONSchemaType<any>;
      const validate = ajv.compile(schema);
      if (!validate(credentialSubject)) {
        console.log(
          `Validation of context ${context.id} error: ${JSON.stringify(
            validate.errors
          )}`
        );
        throw Error(
          "Credential schema validation errors: " +
            validate.errors?.map((e) => e.message).join(", ")
        );
      }
    }
    return credentialSubject;
  } catch (err) {
    if (showToast) {
      toast.add({
        severity: "warn",
        summary: "Credential validation failed",
        detail: err.message,
        life: 10000
      });
    } else {
      offerForm.value.credentialValidation = err.message;
    }
  }
};

const createOffer = async () => {
  try {
    const credentialSubject = validateCredentialSubject(true);
    if (!credentialSubject) return;
    if (!offerForm.value.credentialType) return;

    const offerRequest: CredentialOfferRequest = {
      holderId: offerForm.value.holderId,
      credentialType: offerForm.value.credentialType.credentialType,
      credentialSubject: credentialSubject,
      preAuthorizedCode: offerForm.value.preAuthorizedCode
    };

    const offer = await http.post<CredentialOffer>(
      "oid4vci/offer",
      offerRequest
    );
    toast.add({
      severity: "success",
      summary: "Offer created",
      detail: `Credential offer successfully created`,
      life: 10000
    });
    offerForm.value = offerDefault;
    await loadOffers();
    const offerStatus = offers.value?.find(
      (o) =>
        o.preAuthorizedCode ===
        offer.data.grants?.[
          "urn:ietf:params:oauth:grant-type:pre-authorized_code"
        ]?.["pre-authorization_code"]
    );
    if (offerStatus) {
      expandedRows.value = [...(expandedRows.value ?? []), offerStatus];
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not create offer",
        defaultMessage: `Error in creating new credential offer`
      })
    );
  }
};

const retrieveCredential = async () => {
  try {
    await http.post("oid4vci/holder/request", requestForm.value);
    toast.add({
      severity: "success",
      summary: "Credential retrieved",
      detail: `Credential successfully retrieved, go to the credential overview to see the credential`,
      life: 10000
    });
    requestForm.value = {
      issuerUrl: "",
      preAuthorizedCode: ""
    };
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not retrieve credential",
        defaultMessage: `Error in retrieving credential`
      })
    );
  }
};

const parsedProperties = computed(() => {
  if (offerForm.value.credentialType?.schema?.properties) {
    return offerForm.value.credentialType.schema.properties as Record<
      string,
      any
    >;
  } else {
    return undefined;
  }
});

onMounted(async () => {
  await loadOffers();
  await loadConfig();
});
</script>

<template>
  <div>
    <Card>
      <template #title>Open ID 4 Verifiable Credential Issuance</template>
      <template #subtitle>
        <p>
          <a
            href="https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html"
            target="_blank"
            >OpenID 4 Verifiable Credential Issuance</a
          >
          is a protocol that combines OpenID Connect and Verifiable Credentials
          to enable the issuance of digital credentials in a secure and
          interoperable manner. This protocol streamlines the process of issuing
          and managing credentials, enhancing trust and privacy in online
          interactions.
        </p>
        <Message v-if="!isIssuer" :closable="false" icon="pi pi-info-circle"
          >Since no issuable JSON-LD contexts are provided, this page only shows
          the form for requesting credentials. If you'd like to issue
          credentials via OpenID4VCI, please add a context at
          <RouterLink class="font-semibold" to="/contexts"
            >JSON-LD Contexts</RouterLink
          >.</Message
        >
      </template>
    </Card>
    <Card v-if="isIssuer" class="mt-8">
      <template #title>Credential offers</template>
      <template #subtitle>
        <p>
          Offered OpenID 4 Verifiable Credential Issuance credentials at this
          Wallet instance as issuer.
        </p>
      </template>
      <template #content>
        <DataTable
          v-model:expanded-rows="expandedRows"
          dataKey="id"
          :value="offers"
          sort-field="created"
          :sort-order="-1"
          paginator
          :rows="10">
          <Column expander style="width: 5rem" />
          <Column field="created" header="Created">
            <template #body="props">
              {{ formatDate(props.data.created) }}
            </template>
          </Column>
          <Column field="holderId" header="Holder ID" />
          <Column field="credentialType" header="Type" />
          <Column field="credentialId" header="Issued">
            <template #body="props">
              <i
                v-if="props.data.credentialId"
                class="pi pi-check-circle text-green-500" />
              <i v-else class="pi pi-times-circle text-red-500" />
            </template>
          </Column>
          <Column field="revoked" header="Revoked">
            <template #body="props">
              <Button
                v-if="props.data.revoked"
                class="ml-4"
                severity="danger"
                label="Revoked"
                disabled />
              <Button
                v-else
                class="ml-4"
                severity="danger"
                label="&nbsp;Revoke&nbsp;"
                @click="revokeOffer(props.data.id)" />
            </template>
          </Column>
          <template #expansion="props">
            <FormField label="Issuer URL"
              ><code>{{ issuerUrl }}</code></FormField
            >
            <FormField label="Holder ID"
              ><code>{{ props.data.holderId }}</code></FormField
            >
            <FormField label="Pre Authorized Code"
              ><code>{{ props.data.preAuthorizedCode }}</code></FormField
            >
            <FormField label="Credential Type"
              ><code>{{ props.data.credentialType }}</code></FormField
            >
            <FormField label="Credential Subject">
              <MonacoEditorVue
                :static="props.data.credentialSubject"
                :read-only="true"
                :min-lines="1"
                :max-lines="10" />
            </FormField>
          </template>
        </DataTable>
      </template>
    </Card>
    <Card class="mt-8" v-if="isIssuer">
      <template #title>Create credential offer</template>
      <template #subtitle>
        <p>
          Create a new OpenID 4 Verifiable Credential Issuance flow to offer a
          Verifable Credential to a specific holder.
        </p>
        <p>
          The supported flow is based on the
          <a
            href="https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-pre-authorized-code-flow"
            target="_blank"
            >Pre-Authorized Code Flow</a
          >. The pre authorized code should be shared out-of-band with the
          intended holder of the Credential.
        </p>
      </template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="createOffer">
          <FormField label="Holder ID" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="offerForm.holderId"
              placeholder="did:..."
              pattern="did:(web|tdw):.*"
              validation-message="Target DID must be a DID web"
              required />
          </FormField>
          <FormField label="Credential Type" v-slot="props">
            <Select
              :id="props.id"
              class="w-full"
              v-model="offerForm.credentialType"
              :options="issuableCredentialTypes"
              option-label="credentialType"
              value-label="credentialType"
              placeholder="Credential type" />
          </FormField>
          <template v-if="offerForm.credentialType">
            <FormField
              label="Credential"
              v-slot="props"
              v-if="
                !offerForm.credentialType?.schema || offerForm.manualCredential
              ">
              <MonacoEditorVue
                v-model="offerForm.credentialSubject"
                :schema="offerForm.credentialType?.schema"></MonacoEditorVue>
              <Button
                severity="success"
                v-if="offerForm.credentialType?.schema"
                label="Credential form"
                @click="offerForm.manualCredential = false" />
            </FormField>
            <FormField
              label="Credential Form"
              :label-width="12"
              v-if="
                offerForm.credentialType?.schema && !offerForm.manualCredential
              ">
              <JsonSchemaFormElement
                v-for="(child, key) in parsedProperties"
                :schema="child"
                :key="key"
                :required="
                  offerForm.credentialType?.schema.required.includes(key)
                "
                :name="key"
                @input="
                  ($event) => {
                    offerForm.credentialSubjectObject[key] = $event;
                    updateCredentialSubject();
                  }
                "></JsonSchemaFormElement>
              <FormField no-label>
                <Button
                  severity="warn"
                  v-if="offerForm.credentialType?.schema"
                  label="Manual credential"
                  @click="offerForm.manualCredential = true" />
              </FormField>
            </FormField>
          </template>
          <FormField label="Pre Authorized code" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="offerForm.preAuthorizedCode"
              placeholder="Leave empty to auto generate" />
          </FormField>
          <FormField no-label>
            <Button label="Create offer" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
    <Card class="mt-8">
      <template #title>Request credential</template>
      <template #subtitle>
        <p>
          Request a new credential as intended holder of the credential from an
          issuer that has created a credential offer.
        </p>
        <p>
          The supported flow is based on the
          <a
            href="https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-pre-authorized-code-flow"
            target="_blank"
            >Pre-Authorized Code Flow</a
          >. The pre authorized code should be provided by the issuer in an
          out-of-band manner before you start this flow as holder.
        </p>
      </template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="retrieveCredential">
          <FormField label="Issuer URL" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="requestForm.issuerUrl"
              placeholder="Issuer URL"
              required />
          </FormField>
          <FormField label="Pre Authorized code" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="requestForm.preAuthorizedCode"
              placeholder="Pre Authorized code received from issuer"
              required />
          </FormField>
          <FormField no-label>
            <Button label="Request credential" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped></style>
