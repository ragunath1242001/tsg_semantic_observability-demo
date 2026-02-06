<script setup lang="ts">
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";

const http = injectStrict(AxiosKey);

const toast = useToast();

interface PermissionItem {
  permission: string;
  description: string;
}

const searchQuery = ref("");
const loading = ref(false);
const permissionsData = ref<PermissionItem[]>([]);

const load = async () => {
  loading.value = true;
  try {
    const response = await http.get<PermissionItem[]>("/permissions");
    permissionsData.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not load permissions",
        defaultMessage: "Error in fetching permissions"
      })
    );
  } finally {
    loading.value = false;
  }
};

// Filter permissions based on search
const filteredData = computed(() => {
  if (!searchQuery.value.trim()) {
    return permissionsData.value;
  }
  const query = searchQuery.value.toLowerCase();
  return permissionsData.value.filter(
    (perm) =>
      perm.permission.toLowerCase().includes(query) ||
      perm.description.toLowerCase().includes(query)
  );
});

// Parse permission into action:resource:scope
const parsePermission = (perm: string) => {
  const parts = perm.split(":");
  return {
    action: parts[0] || "",
    resource: parts[1] || "",
    scope: parts[2] || "all"
  };
};

// Get severity based on action
const getActionSeverity = (action: string) => {
  switch (action) {
    case "manage":
      return "danger";
    case "execute":
      return "warning";
    case "read":
      return "info";
    default:
      return "secondary";
  }
};

onMounted(async () => {
  await load();
});
</script>
<template>
  <div>
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <span>Available Permissions</span>
          <Tag
            severity="info"
            :value="`${permissionsData.length} permissions`" />
        </div>
      </template>
      <template #subtitle>
        <p class="text-surface-500 dark:text-surface-400 m-0">
          These are the system-defined permissions that can be assigned to users
          and clients.
        </p>
      </template>
      <template #content>
        <!-- Search -->
        <div class="mb-4">
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="searchQuery"
              placeholder="Search permissions..."
              class="w-full md:w-80" />
          </IconField>
        </div>

        <DataTable
          :value="filteredData"
          :loading="loading"
          paginator
          :rows-per-page-options="[10, 25, 50, 100]"
          :rows="25"
          data-key="permission">
          <template #empty>No permissions found.</template>
          <Column field="permission" header="Permission" sortable>
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <code
                  class="text-sm bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded">
                  {{ data.permission }}
                </code>
              </div>
            </template>
          </Column>
          <Column field="action" header="Action">
            <template #body="{ data }">
              <Tag
                :value="parsePermission(data.permission).action"
                :severity="
                  getActionSeverity(parsePermission(data.permission).action)
                " />
            </template>
          </Column>
          <Column field="resource" header="Resource">
            <template #body="{ data }">
              <span class="font-medium">
                {{ parsePermission(data.permission).resource }}
              </span>
            </template>
          </Column>
          <Column field="scope" header="Scope">
            <template #body="{ data }">
              <Tag
                v-if="parsePermission(data.permission).scope !== 'all'"
                :value="parsePermission(data.permission).scope"
                severity="secondary" />
              <span v-else class="text-surface-400 italic">all</span>
            </template>
          </Column>
          <Column field="description" header="Description">
            <template #body="{ data }">
              <span class="text-surface-600 dark:text-surface-300">
                {{ data.description }}
              </span>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Legend Card -->
    <Card class="mt-4">
      <template #title>Permission Format</template>
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="font-semibold mb-2">Structure</h4>
            <p class="text-surface-600 dark:text-surface-300 mb-2">
              Permissions follow the format:
              <code class="bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded"
                >action:resource[:scope]</code
              >
            </p>
            <ul
              class="list-disc list-inside text-surface-600 dark:text-surface-300 space-y-1">
              <li><strong>action</strong> - What operation is allowed</li>
              <li><strong>resource</strong> - What resource it applies to</li>
              <li>
                <strong>scope</strong> - Optional scope limitation (e.g., "own")
              </li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold mb-2">Actions</h4>
            <div class="flex flex-wrap gap-2">
              <Tag value="read" severity="info" />
              <span class="text-surface-500">View resources</span>
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
              <Tag value="manage" severity="danger" />
              <span class="text-surface-500"
                >Full control (create, update, delete)</span
              >
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
              <Tag value="execute" severity="warning" />
              <span class="text-surface-500">Run operations</span>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
