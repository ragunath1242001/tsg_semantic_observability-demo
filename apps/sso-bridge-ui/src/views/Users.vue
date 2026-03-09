<script setup lang="ts">
import { Action, Resource } from "@tsg-dsp/common-dtos";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { formatRelative } from "@tsg-dsp/common-ui/utils/date";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { setupPagination } from "@tsg-dsp/common-ui/utils/pagination";
import { UserDto, UserWithPasswordDto } from "@tsg-dsp/sso-bridge-dtos";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

import { usePermissions } from "../composables/usePermissions";
import { OAUTH_GRANTS } from "../utils/constants";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";

const http = injectStrict(AxiosKey);

const toast = useToast();
const userStore = useUserStore();
const canCreateUser = computed(() =>
  userStore.canAccessRoute(Action.CREATE, Resource.SSO_USER)
);
const canEditUser = computed(() =>
  userStore.canAccessRoute(Action.UPDATE, Resource.SSO_USER)
);
const canDeleteUser = computed(() =>
  userStore.canAccessRoute(Action.DELETE, Resource.SSO_USER)
);

const submitted = ref(false);

const userObj = {
  id: undefined,
  username: undefined,
  password: undefined,
  email: undefined,
  permissions: [],
  grants: [],
  require2FA: false
} as Partial<UserWithPasswordDto>;

const user = ref<Partial<UserWithPasswordDto>>(userObj);

const { permissions: availablePermissions, loadPermissions } =
  usePermissions(http);

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

const editUser = (data: UserWithPasswordDto) => {
  user.value = { ...data };
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
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error",
        defaultMessage: "User not created"
      })
    );
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
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error",
        defaultMessage: "User not updated"
      })
    );
  }
};

const saveUser = async () => {
  submitted.value = true;

  if (
    user?.value.username?.trim() &&
    user?.value.email?.trim() &&
    user?.value.permissions?.length > 0 &&
    (user?.value.id || (user?.value.password?.trim() ?? "") !== "")
  ) {
    if (user.value.id) {
      if (user?.value.password?.trim() === "") {
        user.value.password = undefined;
      }
      await updateUser();
    } else {
      await createUser();
    }
    await load();
  }
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
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error",
        defaultMessage: "User not deleted"
      })
    );
  }
};

const openDeleteUserDialog = (data: UserWithPasswordDto) => {
  user.value = data;
  deleteUserDialog.value = true;
};

const reset2FADialog = ref(false);

const openReset2FADialog = (data: UserWithPasswordDto) => {
  user.value = data;
  reset2FADialog.value = true;
};

const resetUser2FA = async () => {
  try {
    await http.post(`/users/${user.value.id}/reset-2fa`);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "2FA has been reset for this user",
      life: 3000
    });
    reset2FADialog.value = false;
    await load();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error",
        defaultMessage: error?.response?.data?.message || "Failed to reset 2FA"
      })
    );
  }
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
  await Promise.all([load(), loadPermissions()]);
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
              v-if="canCreateUser"
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
          <Column field="permissions" class="break-all" header="Permissions">
            <template #body="slotProps">
              <div class="flex flex-wrap gap-1 text-xs">
                <Tag
                  v-for="(perm, index) in slotProps.data.permissions.slice(
                    0,
                    5
                  )"
                  :key="index"
                  severity="info"
                  :value="perm" />
                <Tag
                  v-if="slotProps.data.permissions.length > 5"
                  v-tooltip.left="{
                    value: slotProps.data.permissions.slice(5).join('<br />'),
                    escape: false,
                    hideDelay: 500,
                    pt: {
                      root: {
                        style: { '--p-tooltip-max-width': '400px' }
                      }
                    }
                  }"
                  :value="`+${slotProps.data.permissions.length - 5}`"
                  severity="secondary"
                  class="text-xs cursor-help" />
              </div>
              <span
                v-if="
                  !slotProps.data.permissions ||
                  slotProps.data.permissions.length === 0
                "
                class="text-gray-500 italic">
                No permissions
              </span>
            </template>
          </Column>
          <Column field="grants" header="Grants">
            <template #body="slotProps">
              <div class="flex flex-wrap gap-1.5">
                <Tag
                  v-for="grant in slotProps.data.grants"
                  :key="grant"
                  :value="grant"
                  severity="contrast"
                  class="text-xs" />
              </div> </template
          ></Column>
          <Column field="require2FA" header="2FA" sortable>
            <template #body="slotProps">
              <Tag
                v-if="slotProps.data.require2FA"
                severity="success"
                value="Required"
                icon="pi pi-shield" />
              <Tag v-else severity="secondary" value="Optional" />
            </template>
          </Column>
          <Column field="createdDate" header="Created" sortable>
            <template #body="props">
              {{ formatRelative(props.data.createdDate) }}
            </template>
          </Column>
          <Column field="actions" header="Actions">
            <template #body="props">
              <div class="flex flex-wrap gap-1.5">
                <Button
                  v-if="canEditUser"
                  outlined
                  rounded
                  icon="pi pi-pencil"
                  @click="editUser(props.data)" />
                <Button
                  v-if="props.data.require2FA && canEditUser"
                  v-tooltip.top="'Reset 2FA'"
                  outlined
                  rounded
                  severity="warning"
                  icon="pi pi-shield"
                  @click="openReset2FADialog(props.data)" />
                <Button
                  v-if="canDeleteUser"
                  outlined
                  rounded
                  severity="danger"
                  icon="pi pi-times"
                  @click="openDeleteUserDialog(props.data)" />
              </div>
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
            v-if="user.id"
            id="password"
            v-model="user.password"
            placeholder="Leave empty to not change password"
            rows="3"
            cols="20"
            fluid />
          <template v-else>
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
          </template>
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
          <label for="permissions" class="block font-bold mb-3"
            >Permissions</label
          >
          <MultiSelect
            id="permissions"
            v-model="user.permissions"
            filter
            :options="availablePermissions"
            required="true"
            :invalid="submitted && !user.permissions"
            placeholder="Select Permissions"
            fluid>
          </MultiSelect>
          <small
            v-if="submitted && user.permissions.length == 0"
            class="text-red-500"
            >You must select at least one permission.</small
          >
        </div>
        <div>
          <label for="grants" class="block font-bold mb-3">Grants</label>
          <MultiSelect
            id="grants"
            v-model="user.grants"
            :options="OAUTH_GRANTS"
            placeholder="Select Grants"
            fluid>
          </MultiSelect>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox id="require2FA" v-model="user.require2FA" :binary="true" />
          <label for="require2FA" class="font-bold"
            >Require Two-Factor Authentication</label
          >
        </div>
        <small class="text-muted-color">
          When enabled, this user will be required to set up two-factor
          authentication on their first login.
        </small>
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
    <Dialog
      v-model:visible="reset2FADialog"
      :style="{ width: '450px' }"
      header="Reset Two-Factor Authentication"
      :modal="true">
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-4">
          <i class="pi pi-exclamation-triangle !text-3xl text-yellow-500" />
          <span v-if="user">
            Are you sure you want to reset 2FA for
            <b>{{ user.username }}</b
            >?
          </span>
        </div>
        <p class="text-muted-color text-sm">
          This will delete all their TOTP authenticators, passkeys, and recovery
          codes. The user will need to set up 2FA again on their next login.
        </p>
      </div>
      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          text
          @click="reset2FADialog = false" />
        <Button
          label="Reset 2FA"
          icon="pi pi-check"
          severity="warning"
          @click="resetUser2FA" />
      </template>
    </Dialog>
  </div>
</template>
