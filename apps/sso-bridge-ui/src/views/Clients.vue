<script setup lang="ts">
import { Action, Resource } from "@tsg-dsp/common-dtos";
import MonacoEditor from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import { formatRelative } from "@tsg-dsp/common-ui/utils/date";
import { setupPagination } from "@tsg-dsp/common-ui/utils/pagination";
import { ClientAuthMethod, ClientDto } from "@tsg-dsp/sso-bridge-dtos";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

// Extended ClientDto with fields from API response
interface ClientWithDates extends ClientDto {
  createdDate?: Date;
  modifiedDate?: Date;
}

import { useUserStore } from "@tsg-dsp/common-ui/stores/user";

import jwkSchema from "../assets/jwk.schema.json";
import { OAUTH_GRANTS } from "../utils/constants";
import { injectStrict } from "../utils/injectTyped";
import {
  type ECCurve,
  generateJwkKeyPair,
  type KeyType,
  parseJwkFromString,
  type RSAKeySize,
  stringifyJwk
} from "../utils/jwk";
import { AxiosKey } from "../utils/symbols";

const http = injectStrict(AxiosKey);

const toast = useToast();

const userStore = useUserStore();

const canCreateClient = computed(() =>
  userStore.canAccessRoute(Action.CREATE, Resource.SSO_CLIENT)
);
const canEditClient = computed(() =>
  userStore.canAccessRoute(Action.UPDATE, Resource.SSO_CLIENT)
);
const canDeleteClient = computed(() =>
  userStore.canAccessRoute(Action.DELETE, Resource.SSO_CLIENT)
);

const submitted = ref(false);

const clientObj: ClientDto = {
  id: undefined,
  name: undefined,
  secretName: undefined,
  description: undefined,
  clientId: undefined,
  clientSecret: undefined,
  tokenEndpointAuthMethod: "client_secret_post",
  jwk: undefined,
  permissions: [],
  grants: [],
  redirectUris: []
};

const client = ref<ClientDto>(clientObj);

const authMethods: Array<{
  label: string;
  value: ClientAuthMethod;
  icon: string;
  description: string;
}> = [
  {
    label: "Client Secret",
    value: "client_secret_post",
    icon: "pi pi-lock",
    description: "Traditional secret-based authentication"
  },
  {
    label: "Private Key JWT",
    value: "private_key_jwt",
    icon: "pi pi-key",
    description: "Asymmetric key-based authentication"
  },
  {
    label: "None (Public)",
    value: "none",
    icon: "pi pi-globe",
    description: "For public clients like SPAs"
  }
];

const clientPermissions = ref<string[]>([]);
const loadPermissions = async () => {
  try {
    const response = await http.get("/permissions");
    clientPermissions.value = response.data.map((perm) => perm.permission);
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load permissions",
      life: 3000
    });
    console.error("Error loading permissions:", error);
  }
};

const clientDialog = ref(false);
const deleteClientDialog = ref(false);
const keyGenPanelCollapsed = ref(true);

// Computed property to check if client uses private_key_jwt
const usesPrivateKeyJwt = computed(
  () => client.value.tokenEndpointAuthMethod === "private_key_jwt"
);

// Computed property to check if client needs secret
const needsClientSecret = computed(() => {
  const method = client.value.tokenEndpointAuthMethod;
  return !method || method === "client_secret_post";
});

// JWK JSON string for textarea binding
const jwkJsonString = ref("");

// JWK Generation
const generatingKey = ref(false);
const keyType = ref<KeyType>("EC");
const ecCurve = ref<ECCurve>("P-256");
const rsaKeySize = ref<RSAKeySize>(2048);

// Generate JWK key pair in browser
const generateJwk = async () => {
  generatingKey.value = true;

  try {
    const result = await generateJwkKeyPair({
      keyType: keyType.value,
      ecCurve: ecCurve.value,
      rsaKeySize: rsaKeySize.value
    });

    // Set the public key in the editor
    jwkJsonString.value = stringifyJwk(result.publicKey);

    // Copy private key to clipboard
    await navigator.clipboard.writeText(stringifyJwk(result.privateKey));

    toast.add({
      severity: "success",
      summary: "Key Pair Generated",
      detail:
        "Public key set in editor. Private key copied to clipboard - save it securely!",
      life: 8000
    });
  } catch (error) {
    console.error("Error generating key pair:", error);
    toast.add({
      severity: "error",
      summary: "Generation Failed",
      detail: "Could not generate key pair. Please try again.",
      life: 5000
    });
  } finally {
    generatingKey.value = false;
  }
};

// Parse JWK from JSON string
const parseJwk = () => {
  try {
    client.value.jwk = parseJwkFromString(jwkJsonString.value);
    return true;
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Invalid JWK",
      detail:
        error instanceof Error
          ? error.message
          : "The JWK JSON is not valid. Please check the format.",
      life: 5000
    });
    return false;
  }
};

// Search/filter functionality
const searchQuery = ref("");
const filteredData = computed<ClientWithDates[]>(() => {
  const clients = data.value as ClientWithDates[];
  if (!searchQuery.value.trim()) {
    return clients;
  }
  const query = searchQuery.value.toLowerCase();
  return clients.filter(
    (client) =>
      client.name?.toLowerCase().includes(query) ||
      client.clientId?.toLowerCase().includes(query) ||
      client.description?.toLowerCase().includes(query)
  );
});

const openNew = () => {
  client.value = { ...clientObj };
  jwkJsonString.value = "";
  submitted.value = false;
  clientDialog.value = true;
};

const hideDialog = () => {
  clientDialog.value = false;
  submitted.value = false;
};

const editClient = (data: ClientDto) => {
  client.value = { ...data };
  // Initialize JWK JSON string if JWK exists
  jwkJsonString.value = stringifyJwk(data.jwk);
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
  } catch (_) {
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
  } catch (_) {
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

  // Parse JWK if using private_key_jwt
  if (usesPrivateKeyJwt.value && !parseJwk()) {
    return;
  }

  // Validate required fields based on auth method
  const hasRequiredFields =
    client?.value.name?.trim() &&
    client?.value.clientId?.trim() &&
    client?.value.permissions?.length > 0;

  const hasSecretIfNeeded =
    !needsClientSecret.value || client?.value.clientSecret?.trim();

  const hasKeyIfNeeded = !usesPrivateKeyJwt.value || client?.value.jwk;

  if (hasRequiredFields && hasSecretIfNeeded && hasKeyIfNeeded) {
    if (client.value.id) {
      await updateClient();
    } else {
      await createClient();
    }
  }
  await load();
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
    await load();
  } catch (_) {
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

const { data, loading, total, perPage, load } = setupPagination({
  fetch: async (params) => {
    return http.get<ClientDto[]>("/clients", { params });
  },
  errorContext: {
    summary: "Could not load clients",
    defaultMessage: `Error in fetching clients`
  },
  toast
});

// Helper to format auth method for display
const formatAuthMethod = (method?: string) => {
  const found = authMethods.find((m) => m.value === method);
  return found?.label ?? method ?? "Client Secret";
};

// Helper to get auth method icon
const getAuthMethodIcon = (method?: string) => {
  const found = authMethods.find((m) => m.value === method);
  return found?.icon ?? "pi pi-lock";
};

// Copy to clipboard helper
const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({
      severity: "success",
      summary: "Copied",
      detail: `${label} copied to clipboard`,
      life: 2000
    });
  } catch {
    toast.add({
      severity: "error",
      summary: "Failed",
      detail: "Could not copy to clipboard",
      life: 3000
    });
  }
};

onMounted(async () => {
  await Promise.all([load(), loadPermissions()]);
});
</script>
<template>
  <div class="clients-view">
    <!-- Header Section -->
    <div class="mb-6">
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            class="text-2xl font-bold text-surface-900 dark:text-surface-0 m-0">
            Client Management
          </h1>
          <p class="text-surface-500 dark:text-surface-400 mt-1 mb-0">
            Manage OAuth2/OIDC client applications
          </p>
        </div>
        <Button
          v-if="canCreateClient"
          label="Add Client"
          icon="pi pi-plus"
          class="w-full md:w-auto"
          @click="openNew" />
      </div>
    </div>

    <!-- Search Bar -->
    <div class="mb-4">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          placeholder="Search clients by name, ID, or description..."
          class="w-full" />
      </IconField>
    </div>

    <!-- DataView -->
    <DataView
      :value="filteredData"
      :rows="perPage"
      :total-records="total"
      :lazy="false"
      paginator
      layout="list"
      class="client-dataview"
      :rows-per-page-options="[6, 12, 24, 48]">
      <template #empty>
        <div class="flex flex-col items-center justify-center py-16 px-4">
          <i
            class="pi pi-inbox text-6xl text-surface-300 dark:text-surface-600 mb-4" />
          <h3
            class="text-xl font-semibold text-surface-700 dark:text-surface-300 mb-2">
            {{ searchQuery ? "No clients found" : "No clients yet" }}
          </h3>
          <p class="text-surface-500 dark:text-surface-400 text-center mb-4">
            {{
              searchQuery
                ? "Try adjusting your search criteria"
                : "Get started by creating your first OAuth2 client"
            }}
          </p>
          <Button
            v-if="!searchQuery && canCreateClient"
            label="Create Client"
            icon="pi pi-plus"
            @click="openNew" />
        </div>
      </template>

      <template #list="slotProps">
        <div v-if="loading" class="space-y-4">
          <div
            v-for="i in 6"
            :key="i"
            class="p-4 border border-surface-200 dark:border-surface-700 rounded-lg bg-surface-0 dark:bg-surface-900">
            <div class="flex items-start gap-4">
              <Skeleton shape="circle" size="3rem" />
              <div class="flex-1">
                <Skeleton width="60%" height="1.25rem" class="mb-2" />
                <Skeleton width="40%" height="1rem" class="mb-4" />
                <Skeleton width="100%" height="0.75rem" class="mb-2" />
                <Skeleton width="80%" height="0.75rem" />
              </div>
            </div>
          </div>
        </div>

        <div v-else class="">
          <div
            v-for="item in slotProps.items"
            :key="item.id"
            class="border-b-1 border-b-surface-200 dark:border-b-surface-700">
            <div class="flex flex-col lg:flex-row">
              <!-- Left Section: Main Info -->
              <div class="flex-1 p-5">
                <div class="flex items-start gap-4">
                  <!-- Icon -->
                  <div
                    class="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                    <i
                      :class="getAuthMethodIcon(item.tokenEndpointAuthMethod)"
                      class="text-lg text-primary-600 dark:text-primary-400" />
                  </div>

                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-4 mb-3">
                      <div class="min-w-0 flex-1">
                        <h3
                          class="text-base font-semibold text-surface-900 dark:text-surface-0 mb-1.5">
                          {{ item.name }}
                        </h3>
                        <div
                          class="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
                          <span class="font-mono text-xs">{{
                            item.clientId
                          }}</span>
                          <Button
                            icon="pi pi-copy"
                            text
                            rounded
                            severity="secondary"
                            size="small"
                            class="!p-1 !w-5 !h-5"
                            @click.stop="
                              copyToClipboard(item.clientId, 'Client ID')
                            " />
                        </div>
                      </div>

                      <!-- Auth Method Badge -->
                      <Tag
                        :value="formatAuthMethod(item.tokenEndpointAuthMethod)"
                        :severity="
                          item.tokenEndpointAuthMethod === 'private_key_jwt'
                            ? 'success'
                            : item.tokenEndpointAuthMethod === 'none'
                              ? 'warn'
                              : 'info'
                        " />
                    </div>

                    <p
                      v-if="item.description"
                      class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed mb-3 line-clamp-2">
                      {{ item.description }}
                    </p>

                    <!-- Metadata Row -->
                    <div
                      class="flex flex-wrap items-center gap-4 text-xs text-surface-500 dark:text-surface-400">
                      <span>
                        <i class="pi pi-clock mr-1" />
                        {{ formatRelative(item.createdDate) }}
                      </span>
                      <span>
                        <i class="pi pi-database mr-1" />
                        {{ item.secretName }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Section: Permissions, Grants & Actions -->
              <div
                class="border-t lg:border-t-0 lg:border-l border-surface-200/60 dark:border-surface-700/60 p-5 lg:w-96 xl:w-120 2xl:w-144 bg-surface-50/30 dark:bg-surface-800/20">
                <div class="space-y-4">
                  <!-- Permissions -->
                  <div v-if="item.permissions && item.permissions.length > 0">
                    <span
                      class="text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider block mb-2"
                      >Permissions</span
                    >
                    <div class="flex flex-wrap gap-1.5">
                      <Tag
                        v-for="perm in item.permissions.slice(0, 5)"
                        :key="perm"
                        :value="perm"
                        severity="secondary"
                        class="text-xs" />
                      <Tag
                        v-if="item.permissions.length > 5"
                        v-tooltip.left="{
                          value: item.permissions.slice(5).join('<br />'),
                          escape: false,
                          hideDelay: 500,
                          pt: {
                            root: {
                              style: { '--p-tooltip-max-width': '400px' }
                            }
                          }
                        }"
                        :value="`+${item.permissions.length - 5}`"
                        severity="secondary"
                        class="text-xs cursor-help" />
                    </div>
                  </div>

                  <!-- Grants -->
                  <div v-if="item.grants && item.grants.length > 0">
                    <span
                      class="text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider block mb-2"
                      >Grants</span
                    >
                    <div class="flex flex-wrap gap-1.5">
                      <Tag
                        v-for="grant in item.grants"
                        :key="grant"
                        :value="grant"
                        severity="contrast"
                        class="text-xs" />
                    </div>
                  </div>

                  <!-- Actions -->
                  <div
                    class="flex items-center gap-2 pt-3 border-t border-surface-200/60 dark:border-surface-700/60">
                    <Button
                      v-if="canEditClient"
                      label="Edit"
                      icon="pi pi-pencil"
                      size="small"
                      outlined
                      class="flex-1"
                      @click="editClient(item)" />
                    <Button
                      v-if="canDeleteClient"
                      icon="pi pi-trash"
                      size="small"
                      severity="danger"
                      outlined
                      @click="openDeleteClientDialog(item)" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </DataView>

    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="clientDialog"
      :style="{ width: '48rem' }"
      :breakpoints="{ '1199px': '75vw', '575px': '95vw' }"
      :header="client.id ? 'Edit Client' : 'Create New Client'"
      :modal="true"
      :dismissable-mask="true"
      class="client-dialog">
      <div class="space-y-6">
        <!-- Section: Basic Information -->
        <div
          class="space-y-4 pb-6 border-b border-surface-200/40 dark:border-surface-700/40">
          <h3
            class="text-sm font-semibold text-surface-700 dark:text-surface-300 tracking-wider">
            Basic Information
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="field">
              <label for="name" class="block text-sm font-medium mb-2">
                Name <span class="text-red-500">*</span>
              </label>
              <InputText
                id="name"
                v-model.trim="client.name"
                placeholder="My Application"
                :invalid="submitted && !client.name"
                class="w-full" />
              <small v-if="submitted && !client.name" class="text-red-500">
                Name is required
              </small>
            </div>

            <div class="field">
              <label for="clientId" class="block text-sm font-medium mb-2">
                Client ID <span class="text-red-500">*</span>
              </label>
              <InputText
                id="clientId"
                v-model.trim="client.clientId"
                placeholder="my-application"
                :invalid="submitted && !client.clientId"
                class="w-full" />
              <small v-if="submitted && !client.clientId" class="text-red-500">
                Client ID is required
              </small>
            </div>

            <div class="field md:col-span-2">
              <label for="description" class="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                id="description"
                v-model.trim="client.description"
                placeholder="Brief description of the client application"
                rows="2"
                class="w-full" />
            </div>
          </div>
        </div>

        <!-- Section: Authentication -->
        <div
          class="space-y-4 pb-6 border-b border-surface-200/40 dark:border-surface-700/40">
          <h3
            class="text-sm font-semibold text-surface-700 dark:text-surface-300 tracking-wider">
            Authentication
          </h3>
          <div class="space-y-4">
            <div class="field">
              <label class="block text-sm font-medium mb-3">
                Authentication Method
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  v-for="method in authMethods"
                  :key="method.value"
                  :class="[
                    'p-3 rounded-lg cursor-pointer transition-all',
                    client.tokenEndpointAuthMethod === method.value
                      ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500'
                      : 'bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700'
                  ]"
                  @click="client.tokenEndpointAuthMethod = method.value">
                  <div class="flex items-center gap-3">
                    <RadioButton
                      :model-value="client.tokenEndpointAuthMethod"
                      :value="method.value"
                      :input-id="method.value" />
                    <div>
                      <div class="flex items-center gap-2">
                        <i :class="method.icon" class="text-sm" />
                        <span class="font-medium text-sm">{{
                          method.label
                        }}</span>
                      </div>
                      <span
                        class="text-xs text-surface-500 dark:text-surface-400">
                        {{ method.description }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Client Secret Input -->
            <div v-if="needsClientSecret" class="field">
              <label for="secret" class="block text-sm font-medium mb-2">
                Client Secret <span class="text-red-500">*</span>
              </label>
              <Password
                id="secret"
                v-model="client.clientSecret"
                :invalid="
                  submitted && needsClientSecret && !client.clientSecret
                "
                :feedback="false"
                toggle-mask
                class="w-full"
                input-class="w-full" />
              <small
                v-if="submitted && needsClientSecret && !client.clientSecret"
                class="text-red-500">
                Client secret is required
              </small>
            </div>

            <div v-if="needsClientSecret" class="field">
              <label for="secretName" class="block text-sm font-medium mb-2">
                Secret Name <span class="text-red-500">*</span>
              </label>
              <InputText
                id="secretName"
                v-model.trim="client.secretName"
                placeholder="my-app-secret"
                :invalid="submitted && !client.secretName"
                class="w-full" />
              <small class="text-surface-500 block mt-1">
                Kubernetes secret name for storing credentials
              </small>
              <small
                v-if="submitted && !client.secretName"
                class="text-red-500">
                Secret name is required
              </small>
            </div>

            <!-- JWK Input -->
            <div v-if="usesPrivateKeyJwt" class="field">
              <div class="flex items-center justify-between mb-2">
                <label for="jwk" class="block text-sm font-medium">
                  Public Key (JWK) <span class="text-red-500">*</span>
                </label>
              </div>

              <!-- Key Generation Panel -->
              <div
                class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 mb-3">
                <button
                  type="button"
                  class="flex items-center justify-between w-full text-left text-sm font-medium text-surface-900 dark:text-surface-0"
                  @click="keyGenPanelCollapsed = !keyGenPanelCollapsed">
                  <span>Generate Key Pair</span>
                  <i
                    :class="[
                      'pi transition-transform',
                      keyGenPanelCollapsed ? 'pi-chevron-down' : 'pi-chevron-up'
                    ]" />
                </button>

                <div v-show="!keyGenPanelCollapsed" class="mt-4 space-y-4">
                  <p class="text-sm text-surface-600 dark:text-surface-400 m-0">
                    Generate a new key pair in your browser. The public key will
                    be added to the editor below, and the private key will be
                    copied to your clipboard.
                  </p>

                  <div class="flex flex-col sm:flex-row gap-4">
                    <div class="flex-1">
                      <label class="block text-sm font-medium mb-2"
                        >Key Type</label
                      >
                      <SelectButton
                        v-model="keyType"
                        :options="[
                          { label: 'Elliptic Curve', value: 'EC' },
                          { label: 'RSA', value: 'RSA' }
                        ]"
                        option-label="label"
                        option-value="value"
                        class="w-full" />
                    </div>

                    <div v-if="keyType === 'EC'" class="flex-1">
                      <label class="block text-sm font-medium mb-2"
                        >Curve</label
                      >
                      <Select
                        v-model="ecCurve"
                        :options="[
                          { label: 'P-256', value: 'P-256' },
                          { label: 'P-384', value: 'P-384' },
                          { label: 'P-521', value: 'P-521' }
                        ]"
                        option-label="label"
                        option-value="value"
                        class="w-full" />
                    </div>

                    <div v-if="keyType === 'RSA'" class="flex-1">
                      <label class="block text-sm font-medium mb-2"
                        >Key Size</label
                      >
                      <Select
                        v-model="rsaKeySize"
                        :options="[
                          { label: '2048 bits', value: 2048 },
                          { label: '4096 bits', value: 4096 }
                        ]"
                        option-label="label"
                        option-value="value"
                        class="w-full" />
                    </div>
                  </div>

                  <Button
                    label="Generate Key Pair"
                    icon="pi pi-key"
                    :loading="generatingKey"
                    class="w-full sm:w-auto"
                    @click="generateJwk" />

                  <Message severity="warn" :closable="false" class="mt-2">
                    <span class="text-sm">
                      <strong>Important:</strong> The private key will only be
                      put in your clipboard.
                    </span>
                  </Message>
                </div>
              </div>

              <MonacoEditor
                v-model="jwkJsonString"
                :schema="jwkSchema"
                schema-warning
                :min-lines="8"
                :max-lines="12"
                language="json" />
              <small class="text-surface-500 block mt-1">
                Paste the client's public key in JWK format, or generate one
                above
              </small>
              <small
                v-if="submitted && usesPrivateKeyJwt && !jwkJsonString"
                class="text-red-500">
                Public key is required
              </small>
            </div>
          </div>
        </div>

        <!-- Section: Authorization -->
        <div class="space-y-4">
          <h3
            class="text-sm font-semibold text-surface-700 dark:text-surface-300 tracking-wider">
            Authorization
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="field">
              <label for="permissions" class="block text-sm font-medium mb-2">
                Permissions <span class="text-red-500">*</span>
              </label>
              <MultiSelect
                id="permissions"
                v-model="client.permissions"
                filter
                :options="clientPermissions"
                placeholder="Select permissions"
                :invalid="submitted && client.permissions.length === 0"
                display="chip"
                class="w-full" />
              <small
                v-if="submitted && client.permissions.length === 0"
                class="text-red-500">
                At least one permission is required
              </small>
            </div>

            <div class="field">
              <label for="grants" class="block text-sm font-medium mb-2">
                Grant Types
              </label>
              <MultiSelect
                id="grants"
                v-model="client.grants"
                :options="OAUTH_GRANTS"
                placeholder="Select grants"
                display="chip"
                class="w-full" />
            </div>

            <div class="field md:col-span-2">
              <label for="redirectUris" class="block text-sm font-medium mb-2">
                Redirect URIs
              </label>
              <InputChips
                v-model="client.redirectUris"
                separator=","
                placeholder="Enter URIs and press Enter"
                class="w-full" />
              <small class="text-surface-500 block mt-1">
                Allowed callback URLs for OAuth2 flows
              </small>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            text
            @click="hideDialog" />
          <Button
            :label="client.id ? 'Update' : 'Create'"
            icon="pi pi-check"
            @click="saveClient" />
        </div>
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="deleteClientDialog"
      :style="{ width: '28rem' }"
      header="Delete Client"
      :modal="true"
      :dismissable-mask="true">
      <div class="flex items-start gap-4">
        <div
          class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
          <i
            class="pi pi-exclamation-triangle text-xl text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p class="m-0 text-surface-700 dark:text-surface-300">
            Are you sure you want to delete <strong>{{ client.name }}</strong
            >?
          </p>
          <p class="mt-2 mb-0 text-sm text-surface-500 dark:text-surface-400">
            This action cannot be undone. All associated configurations will be
            permanently removed.
          </p>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            text
            @click="deleteClientDialog = false" />
          <Button
            label="Delete"
            severity="danger"
            icon="pi pi-trash"
            @click="deleteClient" />
        </div>
      </template>
    </Dialog>
  </div>
</template>
