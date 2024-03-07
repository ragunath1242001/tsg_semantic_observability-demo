<script setup lang="ts">
import { AppRole, Client } from "@libs/dtos";
import { computed, onMounted, ref } from "vue";
import { axiosInstance, store } from "../store/index.js";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { MultiSelectChangeEvent } from "primevue/multiselect";
import FormField from "../components/FormField.vue";

const toast = useToast();
const confirm = useConfirm();

const clients = ref<Client[]>([]);
const roles = ref(Object.values(AppRole));
const clientForm = ref<{ email: string; secret: string; didId: string }>({
  email: "",
  secret: "",
  didId: "",
});

const changeRoles = async (clientId: string, event: MultiSelectChangeEvent) => {
  const currentRoles = clients.value
    .find((c) => c.clientId === clientId)
    .roles.map((r) => `${r}`);
  const newRoles = event.value as string[];

  await Promise.all(
    currentRoles
      .filter((r) => !newRoles.includes(r))
      .map((r) => removeRole(clientId, r))
  );
  await Promise.all(
    newRoles
      .filter((r) => !currentRoles.includes(r))
      .map((r) => addRole(clientId, r))
  );
  await loadClients();
};
const addRole = async (clientId: string, role: string) => {
  try {
    await axiosInstance.put(
      `management/clients/${encodeURIComponent(
        clientId
      )}/roles/${encodeURIComponent(role)}`
    );
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Role added",
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not add role",
      life: 10000,
    });
  }
};
const removeRole = async (clientId: string, role: string) => {
  try {
    await axiosInstance.delete(
      `management/clients/${encodeURIComponent(
        clientId
      )}/roles/${encodeURIComponent(role)}`
    );
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Role removed",
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not remove role",
      life: 10000,
    });
  }
};
const activate = async (clientId: string) => {
  try {
    await axiosInstance.put(
      `management/clients/${encodeURIComponent(clientId)}/activate`
    );
    await loadClients();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Client activated",
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not activate client",
      life: 10000,
    });
  }
};
const deactivate = async (clientId: string) => {
  try {
    if (clientId === currentClient.value) {
      toast.add({
        severity: "warn",
        summary: "API error",
        detail: "Cannot deactivate current client",
        life: 10000,
      });
      return;
    }
    await axiosInstance.put(
      `management/clients/${encodeURIComponent(clientId)}/deactivate`
    );
    await loadClients();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Client deactivated",
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not deactivate client",
      life: 10000,
    });
  }
};
const removeClient = async (clientId: string) => {
  if (clientId === currentClient.value) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Cannot remove current client",
      life: 10000,
    });
    return;
  }
  confirm.require({
    header: "Are you sure you want to delete this key?",
    message:
      "Existing credentials signed with this key cannotbe used for verifiable presentations anymore!",
    icon: "pi pi-info-circle",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await axiosInstance.delete(
          `management/clients/${encodeURIComponent(clientId)}`
        );
        await loadClients();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Client removed",
          life: 3000,
        });
      } catch (err) {
        toast.add({
          severity: "warn",
          summary: "API error",
          detail: "Could not remove client",
          life: 10000,
        });
      }
    },
  });
};
const addClient = async () => {
  try {
    await axiosInstance.post("management/clients", clientForm.value);
    await loadClients();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Client added",
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not add client",
      life: 10000,
    });
  }
};

const currentClient = computed(() => store.state.client_info?.sub);

const loadClients = async () => {
  try {
    const response = await axiosInstance<Client[] & { rolesCopy: string[] }>(
      "management/clients"
    );
    clients.value = response.data.map((c) => {
      return {
        ...c,
        rolesCopy: c.roles,
      };
    });
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not load clients",
      life: 10000,
    });
  }
};

onMounted(async () => {
  await loadClients();
});
</script>

<template>
  <div>
    <Card>
      <template #title>Clients</template>
      <template #subtitle
        >The current clients registered for this Wallet instance</template
      >
      <template #content>
        <DataTable
          :value="clients"
          sort-field="clientId"
          :sort-order="1"
          paginator
          :rows="10"
        >
          <Column field="clientId" label="ClientID" />
          <Column field="didId" label="DID ID" />
          <Column field="roles" label="Roles">
            <template #body="props">
              <MultiSelect
                style="width: 40rem"
                :options="roles"
                display="chip"
                v-model="props.data.rolesCopy"
                @change="changeRoles(props.data.clientId, $event)"
              />
            </template>
          </Column>
          <Column field="actions" header="Actions">
            <template #body="props">
              <Button
                :disabled="props.data.clientId === currentClient"
                severity="success"
                v-if="props.data.verified"
                @click="deactivate(props.data.clientId)"
                label="Verified"
              />
              <Button
                :disabled="props.data.clientId === currentClient"
                severity="danger"
                v-else
                @click="activate(props.data.clientId)"
                label="Unverified"
              />
              <Button
                class="ml-3"
                :disabled="props.data.clientId === currentClient"
                severity="danger"
                icon="pi pi-times"
                @click="removeClient(props.data.clientId)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
    <Card class="mt-5">
      <template #title>Add client</template>
      <template #subtitle
        >Add a new client for a user or component to this Wallet
        instance</template
      >
      <template #content>
        <form @submit.prevent="addClient">
          <FormField label="Email / client ID" v-slot="props">
            <InputText
              :id="props.id"
              v-model="clientForm.email"
              class="w-full"
            />
          </FormField>
          <FormField label="Secret" v-slot="props">
            <Password
              :id="props.id"
              v-model="clientForm.secret"
              :feedback="false"
              class="w-full"
              inputClass="w-full"
              autocomplete="new-password"
            />
          </FormField>
          <FormField label="DID ID" v-slot="props">
            <InputText
              :id="props.id"
              v-model="clientForm.didId"
              class="w-full"
              pattern="did:web:.*"
              validation-message="DID must be a DID web"
              required
            />
          </FormField>
          <FormField no-label>
            <Button label="Add client" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped></style>
