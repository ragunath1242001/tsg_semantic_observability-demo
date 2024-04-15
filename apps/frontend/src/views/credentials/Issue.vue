<script setup lang="ts">
import { axiosInstance, store } from "../../store/index.js";
import { AppRole, CredentialConfig, JsonLdContextConfig } from "@libs/dtos";
import axios from "axios";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";
import FormField from "../../components/FormField.vue";
import JsonSchemaFormElement from "../../components/JsonSchemaFormElement.vue";
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
const expandedRows = ref();

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
      config.value.contexts?.filter((c) =>
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
      <template #title>Configured contexts</template>
      <template #subtitle
        >Configured context in this wallet instance, which might be used for the
        issue process.</template
      >
      <template #content>
        <DataTable
          v-model:expanded-rows="expandedRows"
          :value="config?.contexts"
          paginator
          :rows="10"
        >
          <Column expander style="width: 5rem" />
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
    <Card class="mt-5">
      <template #title>Issue credential</template>
      <template #subtitle
        >Issue a credential either a self-signed credential, or a credential for
        another party.</template
      >
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
            <Textarea
              :id="props.id"
              class="w-full"
              style="font-family: monospace"
              v-model="credentialForm.credentialSubject"
              rows="10"
              @blur="validateCredentialSubject(false)"
            />
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
  </div>
</template>

<style scoped></style>
