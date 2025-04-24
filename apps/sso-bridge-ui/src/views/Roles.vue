<script setup lang="ts">
import { formatRelative } from "@tsg-dsp/common-ui/utils/date";
import { setupPagination } from "@tsg-dsp/common-ui/utils/pagination";
import { RoleDto, UserDto } from "@tsg-dsp/sso-bridge-dtos";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";

import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";

const http = injectStrict(AxiosKey);

const toast = useToast();

const submitted = ref(false);

const roleObj = {
  id: undefined,
  name: undefined,
  description: undefined
};

const role = ref<RoleDto>(roleObj);
const roleDialog = ref(false);
const deleteRoleDialog = ref(false);

const openNew = () => {
  role.value = roleObj;
  submitted.value = false;
  roleDialog.value = true;
};

const hideDialog = () => {
  roleDialog.value = false;
  submitted.value = false;
};

const editRole = (data: RoleDto) => {
  role.value = { ...data };
  roleDialog.value = true;
};

const createRole = async () => {
  try {
    await http.post("/roles/create", role.value);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Role created",
      life: 3000
    });
    hideDialog();
  } catch (_) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Role not created",
      life: 3000
    });
  }
};

const updateRole = async () => {
  try {
    await http.patch(`/roles/update/${role.value.id}`, role.value);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Role updated",
      life: 3000
    });
    hideDialog();
  } catch (_) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Role not updated",
      life: 3000
    });
  }
};

const saveRole = async () => {
  submitted.value = true;

  if (role?.value.name?.trim() && role?.value.description?.trim()) {
    if (role.value.id) {
      await updateRole();
    } else {
      await createRole();
    }
  }
  await load();
};

const deleteRole = async () => {
  try {
    await http.delete(`/roles/${role.value.id}`);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Role deleted",
      life: 3000
    });
    deleteRoleDialog.value = false;
    await load();
  } catch (_) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Role not deleted",
      life: 3000
    });
  }
};

const openDeleteRoleDialog = (data) => {
  role.value = data;
  deleteRoleDialog.value = true;
};

const { data, loading, total, perPage, load } = setupPagination({
  fetch: async (params) => {
    return http.get<UserDto[]>("/roles", { params });
  },
  errorContext: {
    summary: "Could not load roles",
    defaultMessage: `Error in fetching roles`
  },
  toast
});

onMounted(async () => {
  await load();
});
</script>
<template>
  <div>
    <Card>
      <template #title>Role management</template>
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
          <template #empty>No roles added yet.</template>
          <Column field="name" header="Name" sortable />
          <Column field="description" header="Description" sortable />
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
                @click="editRole(props.data)" />
              <Button
                outlined
                rounded
                severity="danger"
                icon="pi pi-times"
                @click="openDeleteRoleDialog(props.data)" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
    <Dialog
      v-model:visible="roleDialog"
      :style="{ width: '450px' }"
      header="Role Details"
      :modal="true">
      <div class="flex flex-col gap-6">
        <div>
          <label for="name" class="block font-bold mb-3">Name</label>
          <InputText
            id="name"
            v-model.trim="role.name"
            required="true"
            autofocus
            :invalid="submitted && !role.name"
            fluid />
          <small v-if="submitted && !role.name" class="text-red-500"
            >Name is required.</small
          >
        </div>
        <div>
          <label for="description" class="block font-bold mb-3"
            >Description</label
          >
          <InputText
            id="description"
            v-model.trim="role.description"
            required="true"
            :invalid="submitted && !role.description"
            fluid />
          <small v-if="submitted && !role.description" class="text-red-500"
            >Description is required.</small
          >
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
        <Button label="Save" icon="pi pi-check" @click="saveRole" />
      </template>
    </Dialog>
    <Dialog
      v-model:visible="deleteRoleDialog"
      :style="{ width: '450px' }"
      header="Confirm"
      :modal="true">
      <div class="flex items-center gap-4">
        <i class="pi pi-exclamation-triangle !text-3xl" />
        <span v-if="role"
          >Are you sure you want to delete <b>{{ role.name }}</b
          >?</span
        >
      </div>
      <template #footer>
        <Button
          label="No"
          icon="pi pi-times"
          text
          @click="deleteRoleDialog = false" />
        <Button label="Yes" icon="pi pi-check" @click="deleteRole" />
      </template>
    </Dialog>
  </div>
</template>
