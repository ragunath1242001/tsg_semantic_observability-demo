<script setup lang="ts">
import { axiosInstance, store } from "../../store/index.js";
import {
  AppRole,
  CredentialConfig,
  JsonLdContextConfig,
} from "@libs/wallet-dtos";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";
import FormField from "@libs/common-ui/components/FormField.vue";
import JsonSchemaFormElement from "@libs/common-ui/components/JsonSchemaFormElement.vue";
import Ajv, { JSONSchemaType } from "ajv";

interface CredentialForm {
  context: string[];
  type: string[];
  targetDid: string;
  id: string;
  keyId?: string;
  credentialSubject: string;
  credentialSubjectObject: Record<string, any>;
  manualCredential: boolean;
  credentialValidation: string | undefined;
  schema: Record<string, any> | undefined;
}

const toast = useToast();

const formDefault: CredentialForm = {
  context: [],
  type: [],
  targetDid: store.state.user?.didId || "",
  id: "",
  keyId: undefined,
  credentialSubject: JSON.stringify(
    {
      id: store.state.user?.didId || "",
    },
    null,
    2
  ),
  credentialSubjectObject: {},
  manualCredential: false,
  credentialValidation: undefined,
  schema: undefined,
};

const config = ref<CredentialConfig>();
const credentialForm = ref(formDefault);

const didId = computed(() => store.state.user?.didId);

const manager = computed(
  () =>
    store.state.user?.roles.includes(AppRole.MANAGE_OWN_CREDENTIALS) ||
    store.state.user?.roles.includes(AppRole.MANAGE_ALL_CREDENTIALS) ||
    false
);

const issuableContexts = computed(
  () =>
    config.value?.contexts
      ?.filter((c) => c.issuable)
      ?.map((c) => c.documentUrl) ?? []
);

const issuableCredentialTypes = computed(
  () =>
    config.value?.contexts
      ?.filter((c) => c.issuable)
      ?.map((c) => c.credentialType) ?? []
);
const parsedProperties = computed(() => {
  if (credentialForm.value.schema?.properties) {
    return credentialForm.value.schema.properties as Record<string, any>;
  } else {
    return undefined;
  }
});

const loadConfig = async () => {
  try {
    const response = await axiosInstance<CredentialConfig>(
      "management/credentials/config"
    );
    config.value = response.data;
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not load credential config",
      life: 10000,
    });
  }
};

const issueCredential = async () => {
  const credentialSubject = validateCredentialSubject(true);
  if (!credentialSubject) return;

  const credentialConfig = {
    context: credentialForm.value.context,
    type: credentialForm.value.type,
    targetDid: credentialForm.value.targetDid,
    id: encodeURIComponent(credentialForm.value.id),
    credentialSubject: credentialSubject,
  };

  try {
    await axiosInstance.post("management/credentials", credentialConfig);
    toast.add({
      severity: "success",
      summary: "Credential issued",
      detail: `Credential ${credentialForm.value.id} successfully issued`,
      life: 10000,
    });
    credentialForm.value = formDefault;
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not issue credential",
      life: 10000,
    });
  }
};

const useContext = (context: JsonLdContextConfig) => {
  credentialForm.value.context = [
    ...new Set([...credentialForm.value.context, context.documentUrl || ""]),
  ];
  credentialForm.value.schema = context.schema;
  if (
    !context.schema?.properties?.type &&
    !context.schema?.properties?.["@type"]
  ) {
    credentialForm.value.type = [
      ...new Set([...credentialForm.value.type, context.credentialType]),
    ];
  }
};

const updateCredentialSubject = () => {
  credentialForm.value.credentialSubject = JSON.stringify(
    credentialForm.value.credentialSubjectObject,
    null,
    2
  );
};

const validateCredentialSubject = (showToast: boolean) => {
  try {
    let credentialSubject;
    try {
      credentialSubject = JSON.parse(credentialForm.value.credentialSubject);
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
      credentialSubject["id"] !== credentialForm.value.targetDid
    ) {
      throw Error(
        "Credential subject must contain an identifier pointing to the target DID"
      );
    }

    if (!showToast) {
      credentialForm.value.credentialValidation = undefined;
    }

    const contexts: JsonLdContextConfig[] =
      config.value?.contexts?.filter((c) =>
        credentialForm.value.type.includes(c.credentialType)
      ) || [];
    for (const context of contexts) {
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
      credentialForm.value.credentialValidation = err.message;
    }
  }
};

onMounted(async () => {
  await loadConfig();
});
</script>

<template>
  <div>
    <Card>
      <template #title>Manual issue credential</template>
      <template #subtitle>
        <p>
          Issue a credential either a self-signed credential, or a credential
          for another party.
        </p>
        <p>
          The form below allows you to manually create a new Verifiable
          Credential. Either for creating a self-signed credential, or for
          issuing a credential for a remote party.
        </p>
        <p>
          JSON-LD context configurations can be used to streamline the process
          of issuing credentials, the card below the form lists the available
          contexts for this Wallet instance.
        </p>
        <Message :closable="false"
          >Manually issuing credentials for remote parties requires to share the
          issued credential out-of-band with the remote party. If you'd want to
          use automated processes for this, please navigate to the
          <RouterLink to="/credentials/oid4vci">OpenID 4 VCI</RouterLink>
          page.</Message
        >
      </template>
      <template #content>
        <form @submit.prevent="issueCredential">
          <FormField label="Contexts" v-slot="props">
            <MultiSelect
              :id="props.id"
              class="w-full"
              v-model="credentialForm.context"
              :options="issuableContexts"
              placeholder="(Optionally) Add JSON-LD contexts"
            />
          </FormField>
          <FormField label="Type" v-slot="props">
            <MultiSelect
              :id="props.id"
              class="w-full"
              v-model="credentialForm.type"
              :options="issuableCredentialTypes"
              placeholder="Add a Credential type (only if not explicit in credential subject)"
            />
          </FormField>
          <FormField label="Target DID" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="credentialForm.targetDid"
              placeholder="did:web:..."
              pattern="did:web:.*"
              validation-message="Target DID must be a DID web"
              required
            />
          </FormField>
          <FormField label="ID" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="credentialForm.id"
              placeholder="ID"
              required
            />
          </FormField>
          <FormField label="Composite ID" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              :value="`${credentialForm.targetDid}#${encodeURIComponent(
                credentialForm.id
              )}`"
              disabled
            />
          </FormField>
          <FormField
            label="Credential"
            v-slot="props"
            v-if="!credentialForm.schema || credentialForm.manualCredential"
          >
            <MonacoEditorVue
              v-model="credentialForm.credentialSubject"
              :schema="credentialForm.schema"
            ></MonacoEditorVue>
            <Button
              severity="success"
              v-if="credentialForm.schema"
              label="Credential form"
              @click="credentialForm.manualCredential = false"
            />
          </FormField>
          <FormField
            label="Credential Form"
            :label-width="12"
            v-if="credentialForm.schema && !credentialForm.manualCredential"
          >
            <JsonSchemaFormElement
              v-for="(child, key) in parsedProperties"
              :schema="child"
              :key="key"
              :required="credentialForm.schema.required.includes(key)"
              :name="key"
              :didId="didId"
              @input="
                ($event) => {
                  credentialForm.credentialSubjectObject[key] = $event;
                  updateCredentialSubject();
                }
              "
            ></JsonSchemaFormElement>
            <FormField no-label>
              <Button
                severity="warning"
                v-if="credentialForm.schema"
                label="Manual credential"
                @click="credentialForm.manualCredential = true"
              />
            </FormField>
          </FormField>
          <FormField no-label class="mt-5">
            <Button label="Issue credential" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
    <Card class="mt-5">
      <template #title>Configured contexts</template>
      <template #subtitle>
        <p>
          Configured context in this wallet instance, which might be used for
          the issue process.
        </p>
      </template>
      <template #content>
        <DataTable :value="config?.contexts" paginator :rows="10">
          <Column field="id" header="ID" />
          <Column field="credentialType" header="Credential Type" />
          <Column field="issuable" header="Issuable">
            <template #body="props">
              <i
                v-if="props.data.issuable"
                class="pi pi-check-circle text-green-500"
              />
              <i v-else class="pi pi-times-circle text-red-500" />
            </template>
          </Column>
          <Column field="schema" header="Schema">
            <template #body="props">
              <i
                v-if="props.data.schema"
                class="pi pi-check-circle text-green-500"
              />
              <i v-else class="pi pi-times-circle text-red-500" />
            </template>
          </Column>
          <Column field="actions" header="Actions">
            <template #body="props">
              <Button
                severity="success"
                label="Use"
                :disabled="props.data.default"
                @click="useContext(props.data)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped></style>
