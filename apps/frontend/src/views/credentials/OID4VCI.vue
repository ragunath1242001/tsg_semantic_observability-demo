<script setup lang="ts">
import FormField from "../../components/FormField.vue";
import { axiosInstance } from "../../store/index.js";
import {
  CredentialConfig,
  CredentialOffer,
  CredentialOfferRequest,
  CredentialOfferStatus,
  JsonLdContextConfig,
  OfferGrants,
} from "@libs/dtos";
import JsonSchemaFormElement from "../../components/JsonSchemaFormElement.vue";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";
import axios from "axios";
import Ajv, { JSONSchemaType } from "ajv";
import { formatDate } from "../../utils/date.js";
import { JsonTreeView } from "json-tree-view-vue3";

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

const offerDefault: OfferForm = {
  holderId: "",
  credentialType: undefined,
  credentialSubject: "",
  credentialSubjectObject: {},
  preAuthorizedCode: undefined,
  manualCredential: false,
};
const offerForm = ref<OfferForm>(offerDefault);
const requestForm = ref<{ preAuthorizedCode: string; issuerUrl: string }>({
  preAuthorizedCode: "",
  issuerUrl: "",
});

const issuableCredentialTypes = computed(
  () => config.value?.contexts?.filter((c) => c.issuable) ?? []
);

const loadOffers = async () => {
  try {
    const response = await axiosInstance<CredentialOfferStatus[]>(
      "oid4vci/offer"
    );
    offers.value = response.data;
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not load credential offers",
      life: 10000,
    });
  }
};

const loadConfig = async () => {
  try {
    const response = await axiosInstance<CredentialConfig>(
      "management/credentials/config"
    );
    for (const context of response.data.contexts) {
      if (!context.document && context.documentUrl) {
        const contextResponse = await axios.get(context.documentUrl);
        context.document = contextResponse.data;
      }
      if (!context.documentUrl) {
        context.documentUrl = `${document.location.protocol}/${document.location.host}/context/${context.id}`;
      }
    }
    config.value = response.data;

    if (response.data.contexts.filter((c) => c.issuable).length === 0) {
      toast.add({
        severity: "warn",
        summary: "No issuable credentials",
        detail: "No issuable credential types/contexts are configured",
        life: 15000,
      });
    }
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not load credential config",
      life: 10000,
    });
  }
};

const revokeOffer = async (id: number) => {
  try {
    await axiosInstance.put<CredentialOfferStatus>(
      `oid4vci/offer/${id}/revoke`
    );
    await loadOffers();
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not revoke offer",
      life: 10000,
    });
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
      !credentialSubject["id"].startsWith("did:web:") ||
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
    if (context.schema) {
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
        life: 10000,
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
      preAuthorizedCode: offerForm.value.preAuthorizedCode,
    };

    const offer = await axiosInstance.post<CredentialOffer>(
      "oid4vci/offer",
      offerRequest
    );
    toast.add({
      severity: "success",
      summary: "Offer created",
      detail: `Credential offer successfully created`,
      life: 10000,
    });
    offerForm.value = offerDefault;
    await loadOffers();
    const offerStatus = offers.value.find(
      (o) =>
        o.preAuthorizedCode ===
        offer.data.grants?.[OfferGrants.PRE_AUTHORIZATION_CODE]?.[
          "pre-authorization_code"
        ]
    );
    if (offerStatus) {
      expandedRows.value = [...(expandedRows.value ?? []), offerStatus];
    }
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not create offer",
      life: 10000,
    });
  }
};

const retrieveCredential = async () => {
  try {
    await axiosInstance.post("oid4vci/holder/request", requestForm.value);
    toast.add({
      severity: "success",
      summary: "Credential retrieved",
      detail: `Credential successfully retrieved, go to the credential overview to see the credential`,
      life: 10000,
    });
    requestForm.value = {
      issuerUrl: "",
      preAuthorizedCode: "",
    };
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not retrieve credential",
      life: 10000,
    });
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
      <template #title>Credential offers</template>
      <template #subtitle
        >Offered OpenID 4 Verifiable Credential Issuance credentials</template
      >
      <template #content>
        <DataTable
          v-model:expanded-rows="expandedRows"
          dataKey="id"
          :value="offers"
          sort-field="created"
          :sort-order="-1"
          paginator
          :rows="10"
        >
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
                class="pi pi-check-circle text-green-500"
              />
              <i v-else class="pi pi-times-circle text-red-500" />
            </template>
          </Column>
          <Column field="revoked" header="Revoked">
            <template #body="props">
              <Button
                v-if="props.data.revoked"
                class="ml-3"
                severity="danger"
                label="Revoked"
                disabled
              />
              <Button
                v-else
                class="ml-3"
                severity="danger"
                label="&nbsp;Revoke&nbsp;"
                @click="revokeOffer(props.data.id)"
              />
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
              <JsonTreeView
                :data="JSON.stringify(props.data.credentialSubject)"
                color-scheme="dark"
                root-key="CredentialSubject"
                :max-depth="2"
              />
            </FormField>
          </template>
        </DataTable>
      </template>
    </Card>
    <Card class="mt-5">
      <template #title>Create credential offer</template>
      <template #subtitle
        >Create new OpenID 4 Verifiable Credential Issuance flow</template
      >
      <template #content>
        <form @submit.prevent="createOffer">
          <FormField label="Holder ID" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="offerForm.holderId"
              placeholder="did:web:..."
              pattern="did:web:.*"
              validation-message="Target DID must be a DID web"
              required
            />
          </FormField>
          <FormField label="Credential Type" v-slot="props">
            <Dropdown
              :id="props.id"
              class="w-full"
              v-model="offerForm.credentialType"
              :options="issuableCredentialTypes"
              option-label="credentialType"
              value-label="credentialType"
              placeholder="Credential type"
            />
          </FormField>
          <template v-if="offerForm.credentialType">
            <FormField
              label="Credential"
              v-slot="props"
              v-if="
                !offerForm.credentialType?.schema || offerForm.manualCredential
              "
            >
              <Textarea
                :id="props.id"
                class="w-full"
                style="font-family: monospace"
                v-model="offerForm.credentialSubject"
                rows="10"
                @blur="validateCredentialSubject(false)"
              />
              <Button
                severity="success"
                v-if="offerForm.credentialType?.schema"
                label="Credential form"
                @click="offerForm.manualCredential = false"
              />
            </FormField>
            <FormField
              label="Credential Form"
              :label-width="12"
              v-if="
                offerForm.credentialType?.schema && !offerForm.manualCredential
              "
            >
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
                "
              ></JsonSchemaFormElement>
              <FormField no-label>
                <Button
                  severity="warning"
                  v-if="offerForm.credentialType?.schema"
                  label="Manual credential"
                  @click="offerForm.manualCredential = true"
                />
              </FormField>
            </FormField>
          </template>
          <FormField label="Pre Authorized code" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="offerForm.preAuthorizedCode"
              placeholder="Leave empty to auto generate"
            />
          </FormField>
          <FormField no-label>
            <Button label="Create offer" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
    <Card class="mt-5">
      <template #title>Request credential</template>
      <template #subtitle
        >Request a new credential via the OpenID 4 Verifiable Credential
        Issuance flow</template
      >
      <template #content>
        <form @submit.prevent="retrieveCredential">
          <FormField label="Issuer URL" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="requestForm.issuerUrl"
              placeholder="Issuer URL"
              required
            />
          </FormField>
          <FormField label="Pre Authorized code" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="requestForm.preAuthorizedCode"
              placeholder="Pre Authorized code received from issuer"
              required
            />
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
