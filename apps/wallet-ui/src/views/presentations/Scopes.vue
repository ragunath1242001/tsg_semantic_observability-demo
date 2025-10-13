<script setup lang="ts">
import presentationDefinitionSchema from "@tsg-dsp/common-ui/assets/presentation-definition.schema.json";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { setupPagination } from "@tsg-dsp/common-ui/utils/pagination";
import { ScopeDto } from "@tsg-dsp/wallet-dtos";
import { useConfirm, useToast } from "primevue";
import { onMounted, ref } from "vue";

const toast = useToast();
const confirm = useConfirm();
const userStore = useUserStore();

const expandedRows = ref();

const scopeEditId = ref<string | null>(null);
const scopeForm = ref({
  alias: "",
  discriminator: "",
  description: "",
  presentationDefinition: ""
});

const { data, loading, total, perPage, load } = setupPagination({
  fetch: async (params) => {
    return http<ScopeDto[]>("management/presentation/scopes", { params });
  },
  errorContext: {
    summary: "Could not load scopes",
    defaultMessage: `Error in fetching scope configurations`
  },
  initialSort: { sortField: "alias", sortOrder: 1 },
  toast
});

onMounted(async () => {
  await load();
});

const deleteScope = async (scopeId: string) => {
  confirm.require({
    message: "Are you sure you want to delete this scope?",
    header: "Confirm deletion",
    icon: "pi pi-exclamation-triangle",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await http.delete(`management/presentation/scopes/${scopeId}`);
        toast.add({
          severity: "success",
          summary: "Scope deleted",
          detail: "The scope has been successfully deleted"
        });
        await load();
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: "Delete failed",
            defaultMessage: "Could not delete the scope"
          })
        );
      }
    }
  });
};

const edit = (scope: ScopeDto) => {
  scopeEditId.value = scope.id;
  scopeForm.value = {
    alias: scope.alias,
    discriminator: scope.discriminator,
    description: scope.description,
    presentationDefinition: scope.presentationDefinition
      ? JSON.stringify(scope.presentationDefinition, null, 2)
      : ""
  };
};

const cancelEdit = () => {
  scopeEditId.value = null;
  scopeForm.value = {
    alias: "",
    discriminator: "",
    description: "",
    presentationDefinition: ""
  };
};

const addScope = async () => {
  try {
    const scopeData = {
      alias: scopeForm.value.alias,
      discriminator: scopeForm.value.discriminator,
      description: scopeForm.value.description,
      presentationDefinition: scopeForm.value.presentationDefinition?.trim()
        ? JSON.parse(scopeForm.value.presentationDefinition)
        : undefined
    };
    if (scopeEditId.value) {
      await http.put(
        `management/presentation/scopes/${scopeEditId.value}`,
        scopeData
      );
      toast.add({
        severity: "success",
        summary: "Scope updated",
        detail: "The scope has been successfully updated"
      });
    } else {
      await http.post("management/presentation/scopes", scopeData);
      toast.add({
        severity: "success",
        summary: "Scope added",
        detail: "The scope has been successfully created"
      });
    }
    scopeEditId.value = null;
    scopeForm.value = {
      alias: "",
      discriminator: "",
      description: "",
      presentationDefinition: ""
    };
    await load();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Add failed",
        defaultMessage: "Could not create the scope"
      })
    );
  }
};
</script>

<template>
  <div>
    <Card>
      <template #title>Scopes</template>
      <template #subtitle>
        <p>
          Scopes are used in presentation flows to ease the selection of
          credentials by having a single string that converts to a set of
          requirements. Scopes are used in the Decentralized Claims Protocol
          (DCP) to request verifiable credentials from a holder.
        </p>
        <p>
          Interpolation is used to dynamically include values in the scope
          definition.
        </p>
      </template>
      <template #content>
        <DataTable
          v-model:expanded-rows="expandedRows"
          :value="data"
          lazy
          :loading="loading"
          paginator
          :rows-per-page-options="[5, 10, 25, 50]"
          :total-records="total"
          :first="0"
          :rows="perPage"
          data-key="id"
          sort-field="alias"
          :sort-order="1"
          @page="load"
          @sort="load">
          <Column expander style="width: 5rem" />
          <Column field="alias" header="Alias" sortable />
          <Column field="discriminator" header="Discriminator" sortable />
          <Column field="description" header="Description" sortable />
          <Column v-if="!userStore.isReadOnly" field="actions" header="Actions">
            <template #body="props">
              <Button
                class="ml-4"
                severity="danger"
                icon="pi pi-times"
                :disabled="props.data.default"
                @click="deleteScope(props.data.id)" />
              <Button
                class="ml-4"
                severity="warning"
                icon="pi pi-pencil"
                :disabled="props.data.default"
                @click="edit(props.data)" />
            </template>
          </Column>
          <template #expansion="props">
            <FormField label="Identifier">
              <pre>{{ props.data.id }}</pre>
            </FormField>
            <FormField label="Alias">
              <pre>{{ props.data.alias }}</pre>
            </FormField>
            <FormField label="Discriminator">
              <pre>{{ props.data.discriminator }}</pre>
            </FormField>
            <FormField label="Description">
              {{ props.data.description }}
            </FormField>
            <FormField label="Presentation Definition">
              <MonacoEditorVue
                :static="props.data.presentationDefinition"
                :read-only="true"
                :min-lines="3"
                :max-lines="30" />
            </FormField>
          </template>
        </DataTable>
      </template>
    </Card>

    <Card v-if="!userStore.isReadOnly" class="mt-8">
      <template #title>Add scope</template>
      <template #subtitle>
        <p>
          Create a new scope that can be used in presentation requests. A scope
          is a way to define a set of requirements for the credentials being
          requested. By using a scope, the requester can specify what
          credentials they need without having to define the requirements each
          time.
        </p>
        <p>
          Interpolation is used to dynamically include values in the scope
          definition. For example, a scope with alias
          <code>nl.tsg.example</code> and discriminator
          <code>{variable}</code> can be used to request a credential with an
          variable value that is determined at runtime. So a scope of
          <code>nl.tsg.example:12345</code> would request a credential with the
          variable value of <code>12345</code>.
        </p>
      </template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="addScope">
          <FormField label="Alias">
            <InputText
              v-model="scopeForm.alias"
              class="w-full"
              placeholder="Enter alias (e.g. nl.tsg.newscope)" />
          </FormField>
          <FormField label="Discriminator">
            <InputText
              v-model="scopeForm.discriminator"
              class="w-full"
              placeholder="Enter discriminator (e.g. {variable})" />
          </FormField>
          <FormField label="Description">
            <InputText
              v-model="scopeForm.description"
              class="w-full"
              placeholder="Enter description" />
          </FormField>
          <FormField label="Presentation Definition">
            <MonacoEditorVue
              v-model="scopeForm.presentationDefinition"
              :schema="presentationDefinitionSchema"
              :min-lines="15"
              :max-lines="30"></MonacoEditorVue>
          </FormField>
          <FormField no-label>
            <Button
              v-if="!scopeEditId"
              label="Add scope"
              type="submit"
              severity="success" />
            <template v-else>
              <Button label="Update scope" type="submit" severity="warn" />
              <Button
                class="ml-4"
                label="Cancel"
                type="button"
                severity="secondary"
                outlined
                @click="cancelEdit" />
            </template>
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>
