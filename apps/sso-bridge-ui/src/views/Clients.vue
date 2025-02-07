<script setup lang="ts">
import { onMounted, ref } from "vue";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import { useToast } from "primevue/usetoast";
import { ClientDto } from "@tsg-dsp/sso-bridge-dtos";

const http = injectStrict(AxiosKey);

const toast = useToast();

const submitted = ref(false);

const clients = ref<ClientDto[]>([]);

const clientObj = {
  id: undefined,
  name: undefined,
  description: undefined,
  clientId: undefined,
  clientSecret: undefined,
  roles: [],
  grants: []
};

const client = ref<ClientDto>(clientObj);

const clientGrants = [
  "authorization_code",
  "client_credentials",
  "password",
  "refresh_token"
].map((grant) => ({
  label: grant,
  value: grant
}));

const clientDialog = ref(false);
const deleteClientDialog = ref(false);

const openNew = () => {
  client.value = clientObj;
  submitted.value = false;
  clientDialog.value = true;
};

const hideDialog = () => {
  clientDialog.value = false;
  submitted.value = false;
};

const editClient = (data: ClientDto) => {
  client.value = { ...data };
  // @ts-ignore
  client.value.grants = client.value.grants.map((grant) => ({
    label: grant,
    value: grant
  }));
  console.log(client.value);
  clientDialog.value = true;
};

const createClient = async () => {
  try {
    await http.post("/clients/create", client.value);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Client created",
      life: 3000
    });
    hideDialog();
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Client not created",
      life: 3000
    });
  }
};

const updateClient = async () => {
  try {
    await http.patch(`/clients/update/${client.value.id}`, client.value);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Client updated",
      life: 3000
    });
    hideDialog();
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Client not updated",
      life: 3000
    });
  }
};

const saveClient = async () => {
  submitted.value = true;

  if (client?.value.clientId?.trim()) {
    if (client?.value.grants) {
      // @ts-ignore
      client.value.grants = client.value.grants.map((grant) => grant.value);
    }
    if (client.value.id) {
      await updateClient();
    } else {
      await createClient();
    }
  }
  client.value = clientObj;
  await getClients();
};

const deleteClient = async () => {
  try {
    await http.delete(`/clients/${client.value.id}`);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Client deleted",
      life: 3000
    });
    deleteClientDialog.value = false;
    await getClients();
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Client not deleted"
    });
  }
};

const openDeleteClientDialog = (data) => {
  client.value = data;
  deleteClientDialog.value = true;
};

const getClients = async () => {
  try {
    const { data } = await http.get("/clients");
    clients.value = data;
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Clients not fetched"
    });
  }
};

onMounted(async () => {
  await getClients();
  console.log("clients", clients.value);
});
</script>
<template>
  <div>
    <Card>
      <template #title>Client management</template>
      <template #content>
        <Toolbar class="mb-6">
          <template #start>
            <Button
              label="New"
              icon="pi pi-plus"
              class="mr-2"
              @click="openNew" />
          </template>
        </Toolbar>
        <DataTable
          :value="clients"
          sort-field="id"
          :sort-order="1"
          paginator
          :rows="10">
          <template #empty>No clients added yet.</template>
          <Column field="name" header="Name" />
          <Column field="description" header="Description" />
          <Column field="clientId" header="Client ID" />
          <Column field="clientSecret" header="Client Secret" />
          <Column field="roles" class="break-all" header="Roles">
            <template #body="slotProps">
              {{ console.log(slotProps) }}
              <span>{{ slotProps.data.roles.toString() }}</span>
            </template>
          </Column>
          <Column field="grants" header="Grants">
            <template #body="slotProps">
              {{ console.log(slotProps) }}
              <span>{{ slotProps.data.grants.toString() }}</span>
            </template></Column
          >
          <Column field="actions" header="Actions">
            <template #body="props">
              <Button
                outlined
                rounded
                icon="pi pi-pencil"
                class="mr-2"
                @click="editClient(props.data)" />
              <Button
                outlined
                rounded
                severity="danger"
                icon="pi pi-times"
                @click="openDeleteClientDialog(props.data)" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
    <Dialog
      v-model:visible="clientDialog"
      :style="{ width: '450px' }"
      header="Client Details"
      :modal="true">
      <div class="flex flex-col gap-6">
        <div>
          <label for="name" class="block font-bold mb-3">Name</label>
          <InputText
            id="name"
            v-model.trim="client.name"
            required="true"
            autofocus
            :invalid="submitted && !client.name"
            fluid />
          <small v-if="submitted && !client.name" class="text-red-500"
            >Name is required.</small
          >
        </div>
        <div>
          <label for="description" class="block font-bold mb-3"
            >Description</label
          >
          <InputText
            id="description"
            v-model.trim="client.description"
            autofocus
            fluid />
        </div>
        <div>
          <label for="clientId" class="block font-bold mb-3">Client ID</label>
          <InputText
            id="clientId"
            v-model.trim="client.clientId"
            required="true"
            autofocus
            :invalid="submitted && !client.clientId"
            fluid />
          <small v-if="submitted && !client.clientId" class="text-red-500"
            >Client ID is required.</small
          >
        </div>
        <div>
          <label for="secret" class="block font-bold mb-3">Client Secret</label>
          <Password
            id="secret"
            v-model="client.clientSecret"
            :required="true"
            rows="3"
            cols="20"
            fluid />
        </div>
        <div>
          <label for="Roles" class="block font-bold mb-3">Roles</label>
          <MultiSelect
            id="roles"
            v-model="client.roles"
            optionLabel="label"
            placeholder="Select Roles"
            fluid></MultiSelect>
        </div>

        <div>
          <label for="Grants" class="block font-bold mb-3">Grants</label>
          <MultiSelect
            id="grants"
            v-model="client.grants"
            :options="clientGrants"
            optionLabel="label"
            placeholder="Select Grants"
            fluid>
          </MultiSelect>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
        <Button label="Save" icon="pi pi-check" @click="saveClient" />
      </template>
    </Dialog>
    <Dialog
      v-model:visible="deleteClientDialog"
      :style="{ width: '450px' }"
      header="Confirm"
      :modal="true">
      <div class="flex items-center gap-4">
        <i class="pi pi-exclamation-triangle !text-3xl" />
        <span v-if="client"
          >Are you sure you want to delete <b>{{ client.name }}</b
          >?</span
        >
      </div>
      <template #footer>
        <Button
          label="No"
          icon="pi pi-times"
          text
          @click="deleteClientDialog = false" />
        <Button label="Yes" icon="pi pi-check" @click="deleteClient" />
      </template>
    </Dialog>
  </div>
</template>
