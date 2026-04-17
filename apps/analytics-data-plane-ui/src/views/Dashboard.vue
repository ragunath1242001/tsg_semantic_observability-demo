<script setup lang="ts">
import {
  Action,
  DataPlaneStateDto,
  Resource,
  TransferDto
} from "@tsg-dsp/common-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { formatDate } from "@tsg-dsp/common-ui/utils/date.js";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http.js";
import { endpointFor, TransferAction } from "@tsg-dsp/common-ui/utils/transfer";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

import router from "../router";
import { useRuntimeStore } from "../stores/runtime";
import { stateSeverity } from "../utils/stateseverity";

const runtimeStore = useRuntimeStore();

const toast = useToast();
const confirm = useConfirm();

const userStore = useUserStore();
const canExecuteTransfers = computed(() =>
  userStore.canAccessRoute(Action.EXECUTE, Resource.DP_TRANSFER)
);

const state = ref<DataPlaneStateDto>();
const transfers = ref<TransferDto[]>();

const selectedTransfer = ref<TransferDto>();

const consumerTransfers = computed(() => {
  return transfers.value?.filter((t) => t.role === "consumer");
});
const providerTransfers = computed(() => {
  return transfers.value?.filter((t) => t.role === "provider");
});
const showConsumer = computed(() => {
  return (
    state.value?.details?.role === "consumer" ||
    state.value?.details?.role === "both"
  );
});
const showProvider = computed(() => {
  return (
    state.value?.details?.role === "provider" ||
    state.value?.details?.role === "both"
  );
});

const onRowSelect = (event: { data: TransferDto }) => {
  const role = event.data.role;
  if (role === "provider") {
    router.push("/provider/" + event.data.id);
  } else {
    router.push("/consumer/" + event.data.id);
  }
};

const getState = async () => {
  try {
    const response = await http.get<DataPlaneStateDto>("management/state");
    state.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading state failed",
        defaultMessage: "Could not load state from the analytics data plane"
      })
    );
  }
};

const getTransfers = async () => {
  try {
    const response = await http.get<TransferDto[]>("management/transfers");
    transfers.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading transfers failed",
        defaultMessage: "Could not load transfers from the analytics data plane"
      })
    );
  }
};

const action = async (
  event: Event,
  action: TransferAction,
  transfer: TransferDto
) => {
  const target = event.currentTarget as HTMLElement;
  target.classList.add("p-disabled");
  target.classList.add("p-button-loading");
  confirm.require({
    header: `Are you sure you want to ${action} this transfer`,
    message: `Changes to the state of this transfer will be communicated with the remote party, this might be irreversible`,
    rejectLabel: "Cancel",
    acceptLabel: action.charAt(0).toUpperCase() + action.slice(1),
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        let params: Record<string, string> | undefined;
        if (action === "terminate") {
          params = {
            code: "USER_INTERVENTION",
            reason: "Manual user intervention"
          };
        }
        if (action === "suspend") {
          params = {
            reason: "Manual user intervention"
          };
        }
        const endpointAction = endpointFor(action);
        await http.post(
          `management/transfers/${transfer.id}/${endpointAction}`,
          undefined,
          {
            params
          }
        );
        setTimeout(getTransfers, 1000);
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: `Error during transfer ${action}`,
            defaultMessage: `Could not ${action} transfer ${transfer.id}`
          })
        );
      }
      target.classList.remove("p-disabled");
      target.classList.remove("p-button-loading");
    },
    reject: () => {
      target.classList.remove("p-disabled");
      target.classList.remove("p-button-loading");
    }
  });
};

onMounted(async () => {
  await runtimeStore.ensureLoaded();
  if (!runtimeStore.isClientMode) {
    await getState();
    await getTransfers();
  }
});
</script>

<template>
  <Card v-if="runtimeStore.isClientMode">
    <template #title>Runtime mode</template>
    <template #subtitle>Client mode</template>
    <template #content>
      <div class="flex flex-col gap-4">
        <FormField label="Mode">{{ runtimeStore.mode }}</FormField>
        <div class="text-sm text-surface-600">
          This Analytics Data Plane is running in client mode. Transfer and
          registry management is handled server-side.
        </div>
      </div>
    </template>
  </Card>

  <template v-else>
    <Card>
      <template #title>State</template>
      <template #subtitle>State of this HTTP data plane</template>
      <template #content>
        <div v-if="state" class="flex flex-col gap-4">
          <FormField label="Identifier">{{ state.id }}</FormField>
          <FormField label="Type">{{ state.details.dataplaneType }}</FormField>
          <FormField label="Synchronization">{{
            state.details.catalogSynchronization
          }}</FormField>
          <FormField label="Role">{{ state.details.role }}</FormField>
        </div>
      </template>
    </Card>

    <Card v-if="showConsumer" class="mt-8">
      <template #title>Initiated Transfers</template>
      <template #subtitle
        >Transfers executed by this data plane acting as consumer</template
      >
      <template #content>
        <DataTable
          v-model:selection="selectedTransfer"
          :value="consumerTransfers"
          selection-mode="single"
          sort-field="createdDate"
          :sort-order="-1"
          paginator
          :rows="10"
          @row-select="onRowSelect">
          <Column field="remoteId" header="Remote ID">
            <template #body="props">
              {{ props.data.remoteParty }}
            </template>
          </Column>
          <Column field="state" header="State">
            <template #body="props">
              <Tag
                :severity="stateSeverity(props.data.state)"
                :value="props.data.state" />
            </template>
          </Column>
          <Column field="createdDate" header="Date">
            <template #body="props">
              {{ new Date(props.data.createdDate).toLocaleString() }}
            </template>
          </Column>
          <Column v-if="canExecuteTransfers" header="Quick actions">
            <template #body="props">
              <Button
                v-tooltip.bottom="'Terminate'"
                icon="pi pi-times"
                :disabled="
                  ['COMPLETED', 'TERMINATED'].includes(props.data.state)
                "
                severity="danger"
                aria-label="Stop"
                outlined
                @click="action($event, 'terminate', props.data)" />
              <Button
                v-if="props.data.state === 'STARTED'"
                v-tooltip.bottom="'Suspend'"
                class="ml-2"
                icon="pi pi-pause"
                severity="warn"
                aria-label="Suspend"
                outlined
                @click="action($event, 'suspend', props.data)" />
              <Button
                v-else
                v-tooltip.bottom="'Start'"
                :disabled="props.data.state !== 'SUSPENDED'"
                class="ml-2"
                icon="pi pi-play"
                severity="warn"
                aria-label="Start"
                outlined
                @click="action($event, 'start', props.data)" />
              <Button
                v-tooltip.bottom="'Execute'"
                class="ml-2"
                :disabled="props.data.state !== 'STARTED'"
                icon="pi pi-download"
                severity="info"
                aria-label="Execute"
                outlined
                @click="
                  toast.add({
                    severity: 'error',
                    summary: 'Cannot execute transfer',
                    detail:
                      'Execution of transfers is not yet supported in this data plane',
                    life: 10000
                  })
                " />
              <Button
                v-tooltip.bottom="'Complete'"
                class="ml-2"
                :disabled="props.data.state !== 'STARTED'"
                icon="pi pi-check"
                severity="success"
                aria-label="Complete"
                outlined
                @click="action($event, 'complete', props.data)" />
            </template>
          </Column>
          <template #expansion="props">
            <div class="flex flex-col gap-4">
              <FormField label="Local ID">{{ props.data.id }}</FormField>
              <FormField label="Process ID">{{
                props.data.processId
              }}</FormField>
              <FormField label="Date">{{
                new Date(props.data.createdDate).toLocaleString()
              }}</FormField>
              <FormField label="State">
                <Tag
                  :severity="stateSeverity(props.data.state)"
                  :value="props.data.state" />
              </FormField>
              <FormField label="Agreement">{{
                props.data.request.agreementId
              }}</FormField>
              <FormField label="Dataset ID">{{
                props.data.datasetId
              }}</FormField>
            </div>
            <template v-if="props.data.state === 'STARTED'">
              <div class="text-xl my-2">Data address</div>
              <div class="flex flex-col gap-4">
                <FormField label="Endpoint">{{
                  props.data.dataAddress.endpoint
                }}</FormField>
                <FormField label="Properties">
                  <div
                    v-for="property in props.data.dataAddress
                      .endpointProperties"
                    :key="property.name">
                    <strong>{{ property.name }}</strong
                    >: {{ property.value }}
                  </div>
                </FormField>
              </div>
            </template>
          </template>
        </DataTable>
      </template>
    </Card>
    <Card v-if="showProvider" class="mt-8">
      <template #title>Incoming Transfers</template>
      <template #subtitle
        >Transfers executed by this data plane acting as provider</template
      >
      <template #content>
        <DataTable
          v-model:selection="selectedTransfer"
          selection-mode="single"
          :value="providerTransfers"
          sort-field="createdDate"
          :sort-order="-1"
          paginator
          :rows="10"
          @row-select="onRowSelect">
          <Column field="remoteId" header="Remote ID">
            <template #body="props">
              {{ props.data.remoteParty }}
            </template>
          </Column>
          <Column field="state" header="State">
            <template #body="props">
              <Tag
                :severity="stateSeverity(props.data.state)"
                :value="props.data.state" />
            </template>
          </Column>
          <Column field="createdDate" header="Date">
            <template #body="props">
              {{ new Date(props.data.createdDate).toLocaleString() }}
            </template>
          </Column>
          <Column v-if="canExecuteTransfers" header="Quick actions">
            <template #body="props">
              <Button
                v-tooltip.bottom="'Terminate'"
                icon="pi pi-times"
                :disabled="
                  ['COMPLETED', 'TERMINATED'].includes(props.data.state)
                "
                severity="danger"
                aria-label="Terminate"
                outlined
                @click="action($event, 'terminate', props.data)" />
              <Button
                v-if="props.data.state === 'STARTED'"
                v-tooltip.bottom="'Suspend'"
                class="ml-2"
                icon="pi pi-pause"
                severity="warn"
                aria-label="Suspend"
                outlined
                @click="action($event, 'suspend', props.data)" />
              <Button
                v-else
                v-tooltip.bottom="'Start'"
                :disabled="
                  !['SUSPENDED', 'REQUESTED'].includes(props.data.state)
                "
                class="ml-2"
                icon="pi pi-play"
                severity="warn"
                aria-label="Start"
                outlined
                @click="action($event, 'start', props.data)" />
              <Button
                v-tooltip.bottom="'Complete'"
                class="ml-2"
                :disabled="props.data.state !== 'STARTED'"
                icon="pi pi-check"
                severity="success"
                aria-label="Complete"
                outlined
                @click="action($event, 'complete', props.data)" />
            </template>
          </Column>
          <template #expansion="props">
            <FormField label="Local ID">{{ props.data.id }}</FormField>
            <FormField label="Process ID">{{ props.data.processId }}</FormField>
            <FormField label="Date">{{
              formatDate(props.data.createdDate)
            }}</FormField>
            <FormField label="State">
              <Tag
                :severity="stateSeverity(props.data.state)"
                :value="props.data.state" />
            </FormField>
            <FormField label="Agreement">{{
              props.data.request.agreementId
            }}</FormField>
            <FormField label="Dataset ID">{{ props.data.datasetId }}</FormField>
          </template>
        </DataTable>
      </template>
    </Card>
  </template>
</template>
<style scoped>
.card-container {
  display: flex;
  flex-wrap: wrap;
}

.card {
  flex: 1 1 auto;
  margin-right: 1rem;
  /* Adjust margin as needed */
}
</style>
