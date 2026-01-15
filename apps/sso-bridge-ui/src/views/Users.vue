<script setup lang="ts">
import { formatRelative } from "@tsg-dsp/common-ui/utils/date";
import { setupPagination } from "@tsg-dsp/common-ui/utils/pagination";
import { UserDto } from "@tsg-dsp/sso-bridge-dtos";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";

import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";

const http = injectStrict(AxiosKey);

const toast = useToast();

const submitted = ref(false);

const userObj = {
  id: undefined,
  username: undefined,
  password: undefined,
  email: undefined,
  roles: [],
  grants: []
};

const user = ref<UserDto>(userObj);

const userGrants = [
  "authorization_code",
  "client_credentials",
  "password",
  "refresh_token"
].map((grant) => ({
  label: grant,
  value: grant
}));

const userRoles = ref<Array<{ label: string; value: string }>>([]);
const loadRoles = async () => {
  try {
    const response = await http.get("/roles");
    userRoles.value = response.data.map((role) => ({
      label: role.name,
      value: role.name
    }));
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load roles",
      life: 3000
    });
    console.error("Error loading roles:", error);
  }
};

const userDialog = ref(false);
const deleteUserDialog = ref(false);

const openNew = () => {
  user.value = userObj;
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
  // @ts-expect-error Roles should be annotated with label and value
  user.value.roles = user.value.roles.map((role) => ({
    label: role,
    value: role
  }));
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

  if (
    user?.value.username?.trim() &&
    user?.value.password?.trim() &&
    user?.value.email?.trim() &&
    user?.value.roles?.length > 0
  ) {
    if (user?.value.grants) {
      // @ts-expect-error Grants should be annotated with label and value
      user.value.grants = user.value.grants.map((grant) => grant.value);
    }
    // @ts-expect-error Roles should be annotated with label and value
    user.value.roles = user.value.roles.map((role) => role.value);
    if (user.value.id) {
      await updateUser();
    } else {
      await createUser();
    }
  }
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
  },
  toast
});

onMounted(async () => {
  await Promise.all([load(), loadRoles()]);
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
              <div class="flex flex-wrap gap-1 text-xs">
                <Tag
                  v-for="(role, index) in slotProps.data.roles"
                  :key="index"
                  severity="info"
                  :value="role" />
              </div>
              <span
                v-if="
                  !slotProps.data.roles || slotProps.data.roles.length === 0
                "
                class="text-gray-500 italic">
                No roles
              </span>
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
          <label for="username" class="block font-bold mb-3">Username</label>
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
            :invalid="submitted && !user.password"
            rows="3"
            cols="20"
            fluid />
          <small v-if="submitted && !user.password" class="text-red-500"
            >Password is required.</small
          >
        </div>
        <div>
          <label for="email" class="block font-bold mb-3">Email</label>
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
          <label for="roles" class="block font-bold mb-3">Roles</label>
          <MultiSelect
            id="roles"
            v-model="user.roles"
            :options="userRoles"
            required="true"
            :invalid="submitted && !user.roles"
            option-label="label"
            placeholder="Select Roles"
            fluid>
          </MultiSelect>
          <small v-if="submitted && user.roles.length == 0" class="text-red-500"
            >You must select at least one role.</small
          >
        </div>
        <div>
          <label for="grants" class="block font-bold mb-3">Grants</label>
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
