<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import http from "@tsg-dsp/common-ui/utils/http";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

interface JSONLDContext {
  id: string;
  credentialType: string;
  issuable: boolean;
  documentUrl?: string;
  document?: Record<string, any>;
  schema?: Record<string, any>;
}
interface JSONLDContextForm {
  id: string;
  credentialType: string;
  issuable: boolean;
  documentUrl?: string;
  document: string;
  schema: string;
}

const toast = useToast();
const confirm = useConfirm();

const expandedRows = ref();
const currentOrigin = ref(window.location.origin);

const contexts = ref<JSONLDContext[]>([]);
const documentRef = ref("Referenced");
const contextForm = ref<JSONLDContextForm>({
  id: "",
  credentialType: "",
  issuable: true,
  documentUrl: undefined,
  document: "",
  schema: "",
});

const contextEditorHeight = computed(() => {
  const lines = contextForm.value.document?.split("\n")?.length || 0;
  const editorHeight = Math.min(Math.max(lines, 10), 25);
  return `${editorHeight}rem`;
});

const schemaEditorHeight = computed(() => {
  const lines = contextForm.value.document?.split("\n")?.length || 0;
  const editorHeight = Math.min(Math.max(lines, 10), 25);
  return `${editorHeight}rem`;
});

const loadContexts = async () => {
  try {
    const response = await http<JSONLDContext[]>(
      "management/contexts"
    );
    contexts.value = response.data;
  } catch (error) {
    toast.add(toastError({
      error,
      summary: "Could not load contexts",
      defaultMessage: `Error in fetching registered contexts`
    }));
  }
};

const deleteContext = async (contextId: string) => {
  confirm.require({
    header: "Are you sure you want to delete this context?",
    message:
      "This context might be used by other parties to find relevant endpoints!",
    icon: "pi pi-info-circle",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await http.delete(
          `management/contexts/${encodeURIComponent(contextId)}`
        );
        await loadContexts();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Context deleted",
          life: 3000,
        });
      } catch (error) {
        toast.add(toastError({
          error,
          summary: "Could not delete context",
          defaultMessage: `Error in deleting context`
        }));
      }
    },
  });
};

const addContext = async () => {
  try {
    if (documentRef.value === "Hosted") {
      contextForm.value.documentUrl = undefined;
    } else {
      contextForm.value.document = "";
    }
    await http.post("management/contexts", {
      id: contextForm.value.id,
      credentialType: contextForm.value.credentialType,
      issuable: contextForm.value.issuable,
      documentUrl: contextForm.value.documentUrl,
      document: contextForm.value.document.trim() !== ""
        ? JSON.parse(contextForm.value.document)
        : undefined,
      schema: contextForm.value.schema.trim() !== ""
        ? JSON.parse(contextForm.value.schema)
        : undefined,
    });
    await loadContexts();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Context added",
      life: 3000,
    });
    contextForm.value = {
      id: "",
      credentialType: "",
      issuable: true,
      documentUrl: undefined,
      document: "",
      schema: "",
    };
  } catch (error) {
    toast.add(toastError({
      error,
      summary: "Could not add context",
      defaultMessage: `Error in inserting new context to the wallet`
    }));
  }
};

onMounted(async () => {
  await loadContexts();
});
</script>

<template>
  <div>
    <Card>
      <template #title>Contexts</template>
      <template #subtitle>
        <p>
          JSON-LD contexts provide a standardized way to define the structure
          and meaning of data within Verifiable Credentials. It allows for
          interoperability and understanding between different systems and
          applications by establishing common terms and vocabulary. This context
          enables Verifiable Credentials to be exchanged and verified
          consistently across diverse environments, ensuring clarity and trust
          in digital transactions.
        </p>
        <p>
          Within the TSG wallet, these JSON-LD contexts can be accompanied with
          a JSON Schema. This JSON schema is used in UI elements to assist in
          the issuance of credentials.
        </p>
        <p>
          The table below shows all context registered with this Wallet
          instance, currently each context corresponds with one credential type.
        </p>
      </template>
      <template #content>
        <DataTable
          v-model:expanded-rows="expandedRows"
          :value="contexts"
          sort-field="id"
          :sort-order="1"
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
          <Column field="document" header="Document">
            <template #body="props">
              <span v-if="props.data.document">Hosted</span>
              <span v-else>Referenced</span>
            </template>
          </Column>
          <Column field="actions" header="Actions">
            <template #body="props">
              <Button
                severity="danger"
                icon="pi pi-times"
                @click="deleteContext(props.data.id)"
              />
            </template>
          </Column>
          <template #expansion="props">
            <FormField label="Context ID">
              {{ props.data.id }}
            </FormField>
            <FormField label="Credential Type">
              <code>{{ props.data.credentialType }}</code>
            </FormField>
            <FormField label="Issuable">
              <i
                v-if="props.data.issuable"
                class="pi pi-check-circle text-green-500"
              />
              <i v-else class="pi pi-times-circle text-red-500" />
            </FormField>
            <FormField label="Document URL" v-if="props.data.documentUrl">
              <a :href="props.data.documentUrl" target="_blank">
                <code>{{ props.data.documentUrl }}</code>
              </a>
            </FormField>
            <FormField label="Document" v-if="props.data.document">
              <MonacoEditorVue
                :static="props.data.document"
                :read-only="true"
                :min-lines="1"
                :max-lines="20"
              />
            </FormField>
            <FormField label="Schema" v-if="props.data.schema">
              <MonacoEditorVue
                :static="props.data.schema"
                :read-only="true"
                :min-lines="1"
                :max-lines="20"
              />
            </FormField>
          </template>
        </DataTable>
      </template>
    </Card>
    <Card class="mt-8">
      <template #title>Add context</template>
      <template #subtitle>
        <p>
          This form can be used to register a new context to this Wallet. You
          can choose to make the context issuable within this Wallet if you are
          intending to issue credentials based on this context.
        </p>
        <p>
          The context is associated with one credential type. If you want to use
          an existing JSON-LD context that targets multiple credentials, the
          same document reference can be used multiple times.
        </p>
      </template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="addContext">
          <FormField label="Context ID" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="contextForm.id"
              placeholder="Short context identifier"
            />
          </FormField>
          <FormField label="Credential Type" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="contextForm.credentialType"
              placeholder="Credential type associated with this context"
            />
          </FormField>
          <FormField label="Issuable context" v-slot="props">
            <ToggleSwitch :id="props.id" v-model="contextForm.issuable" />
          </FormField>
          <FormField label="Document" v-slot="props">
            <SelectButton
              class="mb-2"
              v-model="documentRef"
              :allow-empty="false"
              :options="['Referenced', 'Hosted']"
              aria-labelledby="basic"
            />
            <div
              v-if="documentRef === 'Referenced'"
              class="flex flex-col gap-2"
            >
              <InputText
                :id="props.id"
                class="w-full"
                v-model="contextForm.documentUrl"
                placeholder="https://..."
              />
              <small
                >Provide the https link to the JSON-LD context to be used</small
              >
            </div>
            <template v-else>
              <MonacoEditorVue v-model="contextForm.document"></MonacoEditorVue>
              <small
                >Provide the contents of the JSON-LD context to be used, the
                context will be available at
                {{ currentOrigin }}/context/CONTEXT_ID</small
              >
            </template>
          </FormField>
          <FormField label="Schema">
            <MonacoEditorVue v-model="contextForm.schema"></MonacoEditorVue>
            <small
              >The JSON schema should target the
              <code>credentialSubject</code> property of a Verifable
              Credential.</small
            >
          </FormField>
          <FormField no-label>
            <Button label="Add context" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>
