<script setup lang="ts">
import { StatusDto } from "@tsg-dsp/wallet-dtos";
import { toRef } from "vue";

const props = defineProps<{
  status: StatusDto;
}>();

const status = toRef(props, "status");
</script>

<template>
  <Card class="col-span-12 lg:col-span-6 xl:col-span-4 h-full">
    <template v-if="status" #content>
      <div class="flex justify-between mb-4">
        <div>
          <span
            class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
            >Keys</span
          >
          <div class="text-surface-900 dark:text-surface-0 font-medium">
            <ul>
              {{
                status.keys
              }}
              registered keys
            </ul>
          </div>
        </div>
        <div
          class="flex items-center justify-center bg-blue-100 rounded-border"
          style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1">
          <i class="pi pi-key text-blue-500 text-xl"></i>
        </div>
      </div>
    </template>
  </Card>
  <Card class="col-span-12 lg:col-span-6 xl:col-span-4 h-full">
    <template v-if="status" #content>
      <div class="flex justify-between mb-4">
        <div>
          <span
            class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
            >Credentials</span
          >
          <div class="text-surface-900 dark:text-surface-0 font-medium">
            {{ status.credentials.selfSigned }} self-signed credentials,
            {{ status.credentials.thirdParty }} third-party signed credentials
          </div>
        </div>
        <div
          class="flex items-center justify-center bg-orange-100 rounded-border"
          style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1">
          <i class="pi pi-file-check text-orange-500 text-xl"></i>
        </div>
      </div>
    </template>
  </Card>
  <Card class="col-span-12 lg:col-span-6 xl:col-span-4 h-full">
    <template v-if="status" #content>
      <div class="flex justify-between mb-4">
        <div>
          <span
            class="block text-surface-500 dark:text-surface-300 font-medium mb-4"
            >Issuance</span
          >
          <div class="text-surface-900 dark:text-surface-0 font-medium">
            {{ status.issuance.issued }} credentials issued,
            {{ status.issuance.open }} open offers
          </div>
        </div>
        <div
          class="flex items-center justify-center bg-cyan-100 rounded-border"
          style="width: 2.5rem; height: 2.5rem; aspect-ratio: 1">
          <i class="pi pi-file-export text-cyan-500 text-xl"></i>
        </div>
      </div>
    </template>
  </Card>
</template>
