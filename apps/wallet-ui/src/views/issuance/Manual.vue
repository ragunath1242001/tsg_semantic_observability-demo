<script setup lang="ts">
import { Action, Resource } from "@tsg-dsp/common-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import JsonSchemaFormElement from "@tsg-dsp/common-ui/components/JsonSchemaFormElement.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { CredentialConfig, IssueConfiguration } from "@tsg-dsp/wallet-dtos";
import Ajv, { JSONSchemaType } from "ajv";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

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
const userStore = useUserStore();
const canIssueManually = computed(() =>
  userStore.canAccessRoute(Action.CREATE, Resource.W_CREDENTIAL)
);

const formDefault: CredentialForm = {
  context: [],
  type: [],
  targetDid: userStore.user?.didId || "",
  id: "",
  keyId: undefined,
  credentialSubject: JSON.stringify(
    {
      id: userStore.user?.didId || ""
    },
    null,
    2
  ),
  credentialSubjectObject: {},
  manualCredential: false,
  credentialValidation: undefined,
  schema: undefined
};

const config = ref<CredentialConfig>();
const credentialForm = ref(formDefault);

const didId = computed(() => userStore.user?.didId);

const issuableContexts = computed(
  () => config.value?.issueConfigurations?.map((c) => c.documentUrl) ?? []
);

const issuableCredentialTypes = computed(
  () => config.value?.issueConfigurations?.map((c) => c.credentialType) ?? []
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

const issueCredential = async () => {
  const credentialSubject = validateCredentialSubject(true);
  if (!credentialSubject) return;

  const credentialConfig = {
    context: credentialForm.value.context,
    type: credentialForm.value.type,
    targetDid: credentialForm.value.targetDid,
    id: encodeURIComponent(credentialForm.value.id),
    credentialSubject: credentialSubject
  };

  try {
    await http.post("management/credentials", credentialConfig);
    toast.add({
      severity: "success",
      summary: "Credential issued",
      detail: `Credential ${credentialForm.value.id} successfully issued`,
      life: 10000
    });
    credentialForm.value = formDefault;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not issue credential",
        defaultMessage: `Error in issuing new credential`
      })
    );
  }
};

const useIssueConfiguration = (issueConfiguration: IssueConfiguration) => {
  credentialForm.value.context = [
    ...new Set([
      ...credentialForm.value.context,
      issueConfiguration.documentUrl || ""
    ])
  ];
  credentialForm.value.schema = issueConfiguration.schema;
  if (
    !issueConfiguration.schema?.properties?.type &&
    !issueConfiguration.schema?.properties?.["@type"]
  ) {
    credentialForm.value.type = [
      ...new Set([
        ...credentialForm.value.type,
        issueConfiguration.credentialType
      ])
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
  const didMethods: string[] = ["did:web:", "did:tdw:"];
  try {
    let credentialSubject;
    try {
      credentialSubject = JSON.parse(credentialForm.value.credentialSubject);
    } catch (_) {
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
      credentialSubject["id"] !== credentialForm.value.targetDid
    ) {
      throw Error(
        "Credential subject must contain an identifier pointing to the target DID"
      );
    }

    if (!showToast) {
      credentialForm.value.credentialValidation = undefined;
    }

    const issueConfigurations: IssueConfiguration[] =
      config.value?.issueConfigurations?.filter((c) =>
        credentialForm.value.type.includes(c.credentialType)
      ) || [];
    for (const issueConfiguration of issueConfigurations) {
      if (issueConfiguration.schema) {
        const ajv = new Ajv({ allErrors: true });
        const schema =
          issueConfiguration.schema as unknown as JSONSchemaType<any>;
        const validate = ajv.compile(schema);
        if (!validate(credentialSubject)) {
          console.log(
            `Validation of issue configuration ${issueConfiguration.id} error: ${JSON.stringify(
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
        life: 10000
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
    <Card v-if="canIssueManually">
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
          Issue configurations can be used to streamline the process of issuing
          credentials, the card below the form lists the available issue
          configurations for this Wallet instance.
        </p>
        <Message :closable="false" icon="pi pi-info-circle"
          >Manually issuing credentials for remote parties requires to share the
          issued credential out-of-band with the remote party. If you'd want to
          use automated processes for this, please navigate to the
          <RouterLink to="/credentials/oid4vci" class="font-semibold"
            >OpenID 4 VCI</RouterLink
          >
          page.</Message
        >
      </template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="issueCredential">
          <FormField v-slot="props" label="Contexts">
            <MultiSelect
              :id="props.id"
              v-model="credentialForm.context"
              class="w-full"
              :options="issuableContexts"
              placeholder="(Optionally) Add JSON-LD contexts" />
          </FormField>
          <FormField v-slot="props" label="Type">
            <MultiSelect
              :id="props.id"
              v-model="credentialForm.type"
              class="w-full"
              :options="issuableCredentialTypes"
              placeholder="Add a Credential type (only if not explicit in credential subject)" />
          </FormField>
          <FormField v-slot="props" label="Target DID">
            <InputText
              :id="props.id"
              v-model="credentialForm.targetDid"
              class="w-full"
              placeholder="did:..."
              pattern="did:(web|tdw):.*"
              validation-message="Target DID must be a DID web"
              required />
          </FormField>
          <FormField v-slot="props" label="ID">
            <InputText
              :id="props.id"
              v-model="credentialForm.id"
              class="w-full"
              placeholder="ID"
              required />
          </FormField>
          <FormField v-slot="props" label="Composite ID">
            <InputText
              :id="props.id"
              class="w-full"
              :value="`${credentialForm.targetDid}#${encodeURIComponent(
                credentialForm.id
              )}`"
              disabled />
          </FormField>
          <FormField
            v-if="!credentialForm.schema || credentialForm.manualCredential"
            label="Credential">
            <MonacoEditorVue
              v-model="credentialForm.credentialSubject"
              :schema="credentialForm.schema"></MonacoEditorVue>
            <Button
              v-if="credentialForm.schema"
              severity="success"
              label="Credential form"
              @click="credentialForm.manualCredential = false" />
          </FormField>
          <FormField
            v-if="credentialForm.schema && !credentialForm.manualCredential"
            label="Credential Form"
            :label-width="12">
            <JsonSchemaFormElement
              v-for="(child, key) in parsedProperties"
              :key="key"
              :schema="child"
              :required="credentialForm.schema.required.includes(key)"
              :name="key"
              :did-id="didId"
              @input="
                ($event) => {
                  credentialForm.credentialSubjectObject[key] = $event;
                  updateCredentialSubject();
                }
              "></JsonSchemaFormElement>
            <FormField no-label>
              <Button
                v-if="credentialForm.schema"
                severity="warn"
                label="Manual credential"
                @click="credentialForm.manualCredential = true" />
            </FormField>
          </FormField>
          <FormField no-label class="mt-8">
            <Button label="Issue credential" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
    <Card class="mt-8">
      <template #title>Configured issue configurations</template>
      <template #subtitle>
        <p>
          Configured issue configurations in this wallet instance, which might
          be used for the issue process.
        </p>
      </template>
      <template #content>
        <DataTable :value="config?.issueConfigurations" paginator :rows="10">
          <Column field="id" header="ID" />
          <Column field="credentialType" header="Credential Type" />
          <Column field="schema" header="Schema">
            <template #body="props">
              <i
                v-if="props.data.schema"
                class="pi pi-check-circle text-green-500" />
              <i v-else class="pi pi-times-circle text-red-500" />
            </template>
          </Column>
          <Column field="actions" header="Actions">
            <template #body="props">
              <Button
                severity="success"
                label="Use"
                :disabled="props.data.default"
                @click="useIssueConfiguration(props.data)" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped></style>
