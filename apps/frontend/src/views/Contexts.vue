<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { KeyInfo } from "@libs/dtos";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { JsonTreeView } from "json-tree-view-vue3";
import FormField from "../components/FormField.vue";
import { axiosInstance, store } from "../store/index.js";
import { MonacoEditor, VueMonacoEditor, VueMonacoEditorEmitsOptions } from '@guolao/vue-monaco-editor';
import MonacoEditorVue from "../components/MonacoEditor.vue";

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
  document?: string;
  schema?: string;
}

const toast = useToast();
const confirm = useConfirm();

const expandedRows = ref();

const contexts = ref<JSONLDContext[]>([]);
const documentRef = ref('Referenced');
const contextForm = ref<JSONLDContextForm>({
  id: "",
  credentialType: "",
  issuable: true,
  documentUrl: undefined,
  document: undefined,
  schema: undefined
});

const contextEditorHeight = computed(() => {
  const lines = contextForm.value.document?.split('\n')?.length || 0;
  const editorHeight = Math.min(Math.max(lines, 10), 25);
  return `${editorHeight}rem`
})

const schemaEditorHeight = computed(() => {
  const lines = contextForm.value.document?.split('\n')?.length || 0;
  const editorHeight = Math.min(Math.max(lines, 10), 25);
  return `${editorHeight}rem`
})


const loadContexts = async () => {
  try {
    const response = await axiosInstance<JSONLDContext[]>("management/contexts");
    contexts.value = response.data;
  } catch (err) {
    const message = err.response?.data?.message || "Could not load contexts";
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: message,
      life: 10000,
    });
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
        await axiosInstance.delete(
          `management/contexts/${encodeURIComponent(contextId)}`
        );
        await loadContexts();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Context deleted",
          life: 3000,
        });
      } catch (err) {
        const message = err.response?.data?.message || "Could not delete context";
        toast.add({
          severity: "warn",
          summary: "API error",
          detail: message,
          life: 10000,
        });
      }
    },
  });
};

const addContext = async () => {
  try {
    if (documentRef.value === 'Hosted') {
      contextForm.value.document = undefined;
    } else {
      contextForm.value.documentUrl = undefined;
    }
    contextForm.value.credentialType
    await axiosInstance.post("management/contexts", {
      id: contextForm.value.id,
      credentialType: contextForm.value.credentialType,
      issuable: contextForm.value.issuable,
      documentUrl: contextForm.value.documentUrl,
      document: (contextForm.value.document) ? JSON.parse(contextForm.value.document) : undefined,
      schema: (contextForm.value.schema) ? JSON.parse(contextForm.value.schema) : undefined
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
      document: undefined,
      schema: undefined
    }
  } catch (err) {
    console.log(err);
    const message = err.response?.data?.message || "Could not add context";
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: message,
      life: 10000,
    });
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
      <template #subtitle
        >The current contexts registered for this Wallet instance</template
      >
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
              <code v-if="props.data.issuable">true</code>
              <code v-else>false</code>
            </FormField>
            <FormField label="Document URL" v-if="props.data.documentUrl">
              <a :href="props.data.documentUrl" target="_blank">
                <code>{{ props.data.documentUrl }}</code>
              </a>
            </FormField>
            <FormField label="Document" v-if="props.data.document">
              <JsonTreeView 
                color-scheme="dark"
                root-key="JSON-LD Context"
                :max-depth="5"
                :data="JSON.stringify(props.data.document)" />
            </FormField>
            <FormField label="Schema" v-if="props.data.schema">
              <JsonTreeView
                color-scheme="dark"
                root-key="JSON Schema"
                :max-depth="5"
                :data="JSON.stringify(props.data.schema)" />
            </FormField>
          </template>
        </DataTable>
      </template>
    </Card>
    <Card class="mt-5">
      <template #title>Add context</template>
      <template #content>
        <form @submit.prevent="addContext">
          <FormField label="Context ID" v-slot="props">
            <InputText :id="props.id" class="w-full" v-model="contextForm.id" placeholder="Short context identifier" />
          </FormField>
          <FormField label="Credential Type" v-slot="props">
            <InputText :id="props.id" class="w-full" v-model="contextForm.credentialType" placeholder="Credential type associated with this context" />
          </FormField>
          <FormField label="Issuable Endpoint" v-slot="props">
            <InputSwitch :id="props.id" v-model="contextForm.issuable" />
          </FormField>
          <FormField label="Document" v-slot="props">
            <SelectButton class="mb-2" v-model="documentRef" :allow-empty="false" :options="['Referenced', 'Hosted']" aria-labelledby="basic" />
            <InputText v-if="documentRef === 'Referenced'" :id="props.id" class="w-full" v-model="contextForm.documentUrl" placeholder="https://..." />
            <MonacoEditorVue v-else
              v-model="contextForm.document"
            ></MonacoEditorVue>
          </FormField>
          <FormField label="Schema">
            <MonacoEditorVue
              v-model="contextForm.schema"
            ></MonacoEditorVue>
          </FormField>
          <FormField no-label>
            <Button label="Add context" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>
