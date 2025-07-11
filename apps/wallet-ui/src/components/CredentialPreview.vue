<script setup lang="ts">
import { IssueConfiguration } from "@tsg-dsp/wallet-dtos";
import { computed, ref } from "vue";

const dialogVisible = ref(false);

const props = defineProps<{
  configuration: Omit<IssueConfiguration, "document" | "schema"> & {
    schema?: Record<string, unknown> | string;
  };
  example?: string;
  placeholders: boolean;
}>();

interface ClaimInfo {
  name: string;
  displayName: string;
  sampleValue: unknown;
  required: boolean;
}

// Function to extract claims from schema
const extractClaimsFromSchema = (
  schema: Record<string, unknown> | undefined
): ClaimInfo[] => {
  if (!schema || typeof schema.properties !== "object" || !schema.properties)
    return [];

  const claims: ClaimInfo[] = [];
  const required = (schema.required as string[]) || [];

  for (const [key, property] of Object.entries(schema.properties)) {
    if (typeof property === "object" && property !== null) {
      const prop = property as Record<string, unknown>;
      claims.push({
        name: key,
        displayName: (prop.title as string) || key,
        sampleValue: prop.example || prop.default || "Sample value",
        required: required.includes(key)
      });
    }
  }

  return claims;
};

const claims = computed(() => {
  if (typeof props.configuration.schema === "string") {
    try {
      return extractClaimsFromSchema(JSON.parse(props.configuration.schema));
    } catch (_error) {
      return [];
    }
  } else {
    return extractClaimsFromSchema(props.configuration.schema);
  }
});

// Generate sample dates
const issuedDate = computed(() => {
  const date = new Date();
  date.setDate(date.getDate() - 30); // 30 days ago
  return date.toISOString().slice(0, 10);
});

const expiryDate = computed(() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1); // 1 year from now
  return date.toISOString().slice(0, 10);
});

const issuerIdentifier = computed(() => {
  return "did:web:issuer.example.com";
});
</script>

<template>
  <div class="max-w-sm my-4">
    <div
      class="w-full h-60 rounded-2xl p-5 relative overflow-hidden shadow-2xl border border-white/20 backdrop-blur-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-1xl cursor-pointer"
      :style="{
        backgroundColor: configuration.backgroundColor || '#dddddd',
        color: `${configuration.textColor || '#000000'} !important`
      }"
      @click="dialogVisible = true">
      <img
        v-if="configuration.backgroundImage"
        :src="configuration.backgroundImage"
        alt="Background"
        class="absolute bottom-2.5 right-2.5 w-32 h-32 object-contain rounded-lg opacity-80 z-0" />

      <div
        class="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 z-10"></div>

      <div class="h-full flex flex-col justify-between relative z-20">
        <div class="mb-4">
          <h3 class="text-2xl font-bold mb-2 leading-tight text-inherit">
            {{
              configuration.name ||
              configuration.credentialType ||
              (placeholders ? "Credential Name" : "")
            }}
          </h3>
          <p class="text-sm font-medium uppercase tracking-wider opacity-80">
            {{
              configuration.description ||
              (placeholders ? "Credential Description" : "")
            }}
          </p>
        </div>
        <div class="flex-1 flex items-center">
          <p class="text-sm leading-relaxed opacity-90">
            {{ example }}
          </p>
        </div>
        <div class="mt-4">
          <small class="text-xs opacity-70 font-mono"
            >Expires: {{ expiryDate }}</small
          >
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="dialogVisible"
      modal
      header="Credential Details"
      class="overflow-hidden"
      :closable="false"
      :close-on-escape="true"
      :dismissable-mask="true"
      :style="{ width: '90vw', maxWidth: '45rem' }"
      :pt:header:style="{
        backgroundColor: configuration.backgroundColor || '#dddddd',
        color: `${configuration.textColor || '#000000'} !important`
      }">
      <template #header>
        <div class="relative overflow-hidden w-full h-24">
          <img
            v-if="configuration.backgroundImage"
            :src="configuration.backgroundImage"
            alt="Background"
            class="absolute top-2 right-2 w-20 h-20 object-contain rounded-lg opacity-80 z-0" />
          <div class="relative z-20 flex justify-between items-start">
            <div class="flex-1 pr-12">
              <h2 class="text-2xl font-bold mb-2 text-inherit">
                {{
                  configuration.name ||
                  configuration.credentialType ||
                  "Credential Details"
                }}
              </h2>
              <p
                class="text-sm font-medium uppercase tracking-wider opacity-80">
                {{
                  configuration.description ||
                  "Credential information and claims"
                }}
              </p>
            </div>
          </div>
        </div>
      </template>
      <div class="p-6">
        <!-- Credential Information -->
        <div class="mb-8">
          <h3
            class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Credential Information
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Issuer Identifier
              </label>
              <p
                class="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                {{ issuerIdentifier }}
              </p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Credential Type
              </label>
              <p class="text-sm text-gray-900 dark:text-gray-100">
                {{ configuration.credentialType || "N/A" }}
              </p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Issued Date
              </label>
              <p class="text-sm text-gray-900 dark:text-gray-100">
                {{ issuedDate }}
              </p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date
              </label>
              <p class="text-sm text-gray-900 dark:text-gray-100">
                {{ expiryDate }}
              </p>
            </div>
          </div>
        </div>

        <!-- Claims -->
        <div v-if="claims.length > 0">
          <h3
            class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Claims
          </h3>
          <div class="space-y-3">
            <div
              v-for="claim in claims"
              :key="claim.name"
              class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div class="flex justify-between items-start mb-2">
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ claim.displayName }}
                </label>
                <span
                  v-if="claim.required"
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                  Required
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                  Optional
                </span>
              </div>
              <p class="text-sm text-gray-900 dark:text-gray-100">
                {{ claim.sampleValue }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Field: {{ claim.name }}
              </p>
            </div>
          </div>
        </div>

        <div v-else>
          <h3
            class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Claims
          </h3>
          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              No schema defined for this credential configuration
            </p>
          </div>
        </div>
      </div>
      <template #footer>
        <Button
          class="mt-3"
          label="Close"
          text
          severity="secondary"
          autofocus
          @click="dialogVisible = false" />
      </template>
    </Dialog>
  </div>
</template>
