<script setup lang="ts">
import { onMounted, ref } from "vue";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import { useToast } from "primevue/usetoast";
import { UserDto } from "@tsg-dsp/sso-bridge-dtos";
import { setupPagination } from "@tsg-dsp/common-ui/utils/pagination";
import { formatRelative } from "@tsg-dsp/common-ui/utils/date";

const http = injectStrict(AxiosKey);

const toast = useToast();

const submitted = ref(false);

const user = ref<UserDto>({
  username: undefined,
  password: undefined,
  email: undefined,
  roles: [],
  grants: []
});

const userGrants = [
  "authorization_code",
  "client_credentials",
  "password",
  "refresh_token"
].map((grant) => ({
  label: grant,
  value: grant
}));

const userDialog = ref(false);
const deleteUserDialog = ref(false);

const openNew = () => {
  user.value = {
    username: undefined,
    password: undefined,
    email: undefined,
    roles: [],
    grants: []
  };
  submitted.value = false;
  userDialog.value = true;
};

const hideDialog = () => {
  userDialog.value = false;
  submitted.value = false;
};

const editUser = (data: UserDto) => {
  user.value = { ...data };
  // @ts-expect-error Grants should be annotated with label and value
  user.value.grants = user.value.grants.map((grant) => ({
    label: grant,
    value: grant
  }));
  console.log(user.value);
  userDialog.value = true;
};

const createUser = async () => {
  try {
    await http.post("/users/create", user.value);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "User created",
      life: 3000
    });
    hideDialog();
  } catch (_) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "User not created",
      life: 3000
    });
  }
};

const updateUser = async () => {
  try {
    await http.patch(`/users/update/${user.value.id}`, user.value);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "User updated",
      life: 3000
    });
    hideDialog();
  } catch (_) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "User not updated",
      life: 3000
    });
  }
};

const saveUser = async () => {
  submitted.value = true;

  if (user?.value.username?.trim()) {
    if (user?.value.grants) {
      // @ts-expect-error Grants should be annotated with label and value
      user.value.grants = user.value.grants.map((grant) => grant.value);
    }
    if (user.value.id) {
      await updateUser();
    } else {
      await createUser();
    }
  }
  user.value = {
    username: undefined,
    password: undefined,
    email: undefined,
    roles: [],
    grants: []
  };
  await load();
};

const deleteUser = async () => {
  try {
    await http.delete(`/users/${user.value.id}`);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "User deleted",
      life: 3000
    });
    deleteUserDialog.value = false;
    await load();
  } catch (_) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "User not deleted",
      life: 3000
    });
  }
};

const openDeleteUserDialog = (data) => {
  user.value = data;
  deleteUserDialog.value = true;
};

const { data, loading, total, perPage, load } = setupPagination({
  fetch: async (params) => {
    return http.get<UserDto[]>("/users", { params });
  },
  errorContext: {
    summary: "Could not load users",
    defaultMessage: `Error in fetching users`
  }
});

onMounted(async () => {
  await load();
});
</script>
<template>
  <div>
    <Card>
      <template #title>User management</template>
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
          :value="data"
          lazy
          :loading="loading"
          paginator
          :rows-per-page-options="[5, 10, 25, 50]"
          :total-records="total"
          :first="0"
          :rows="perPage"
          data-key="id"
          sort-field="createdDate"
          :sort-order="1"
          @page="load"
          @sort="load">
          <template #empty>No users added yet.</template>
          <Column field="username" header="Username" sortable />
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
          <Column field="createdDate" header="Created" sortable>
            <template #body="props">
              {{ formatRelative(props.data.createdDate) }}
            </template>
          </Column>
          <Column field="actions" header="Actions">
            <template #body="props">
              <Button
                outlined
                rounded
                icon="pi pi-pencil"
                class="mr-2"
                @click="editUser(props.data)" />
              <Button
                outlined
                rounded
                severity="danger"
                icon="pi pi-times"
                @click="openDeleteUserDialog(props.data)" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
    <Dialog
      v-model:visible="userDialog"
      :style="{ width: '450px' }"
      header="User Details"
      :modal="true">
      <div class="flex flex-col gap-6">
        <div>
          <label for="name" class="block font-bold mb-3">Username</label>
          <InputText
            id="username"
            v-model.trim="user.username"
            required="true"
            autofocus
            :invalid="submitted && !user.username"
            fluid />
          <small v-if="submitted && !user.username" class="text-red-500"
            >Username is required.</small
          >
        </div>
        <div>
          <label for="password" class="block font-bold mb-3">Password</label>
          <Password
            id="password"
            v-model="user.password"
            :required="true"
            rows="3"
            cols="20"
            fluid />
        </div>
        <div>
          <label for="name" class="block font-bold mb-3">Email</label>
          <InputText
            id="email"
            v-model.trim="user.email"
            required="true"
            autofocus
            :invalid="submitted && !user.email"
            fluid />
          <small v-if="submitted && !user.email" class="text-red-500"
            >Email is required.</small
          >
        </div>
        <div>
          <label for="Roles" class="block font-bold mb-3">Roles</label>
          <MultiSelect
            id="roles"
            v-model="user.roles"
            option-label="label"
            placeholder="Select Roles"
            fluid></MultiSelect>
        </div>

        <div>
          <label for="Grants" class="block font-bold mb-3">Grants</label>
          <MultiSelect
            id="grants"
            v-model="user.grants"
            :options="userGrants"
            option-label="label"
            placeholder="Select Grants"
            fluid>
          </MultiSelect>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
        <Button label="Save" icon="pi pi-check" @click="saveUser" />
      </template>
    </Dialog>
    <Dialog
      v-model:visible="deleteUserDialog"
      :style="{ width: '450px' }"
      header="Confirm"
      :modal="true">
      <div class="flex items-center gap-4">
        <i class="pi pi-exclamation-triangle !text-3xl" />
        <span v-if="user"
          >Are you sure you want to delete <b>{{ user.username }}</b
          >?</span
        >
      </div>
      <template #footer>
        <Button
          label="No"
          icon="pi pi-times"
          text
          @click="deleteUserDialog = false" />
        <Button label="Yes" icon="pi pi-check" @click="deleteUser" />
      </template>
    </Dialog>
  </div>
</template>
