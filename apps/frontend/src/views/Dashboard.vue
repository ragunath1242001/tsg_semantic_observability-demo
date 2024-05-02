<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { axiosInstance } from "../store/index.js";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { DataPlaneStateDto, TransferDto } from "@libs/dtos";
import FormField from "../components/FormField.vue";
import { JsonTreeView } from "json-tree-view-vue3";
import { store } from "../store/index.js";

const toast = useToast();
const confirm = useConfirm();

const showDataset = ref(false);
const state = ref<DataPlaneStateDto>();
const transfers = ref<TransferDto[]>();
const consumerTransfers = computed(() => {
  return transfers.value?.filter(t => t.role === "consumer")
})
const providerTransfers = computed(() => {
  return transfers.value?.filter(t => t.role === "provider")
})
const showConsumer = computed(() => {
  return state.value?.details?.role === 'consumer' || state.value?.details?.role === 'both'
});
const showProvider = computed(() => {
  return state.value?.details?.role === 'provider' || state.value?.details?.role === 'both'
});
const expandedConsumerRows = ref();
const expandedProviderRows = ref();

const getState = async () => {
  try {
    const response = await axiosInstance.get<DataPlaneStateDto>("management/state");
    state.value = response.data;
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "Loading state failed",
      detail: "Could not load state from the HTTP data plane",
      life: 10000,
    });
  }
}

const getTransfers = async () => {
  try {
    const response = await axiosInstance.get<TransferDto[]>("management/transfers");
    transfers.value = response.data;
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "Loading state failed",
      detail: "Could not load state from the HTTP data plane",
      life: 10000,
    });
  }
}

const stateSeverity = (state: string) => {
  switch (state) {
    case "dspace:STARTED":
      return "primary";
    case "dspace:COMPLETED":
      return "success";
    case "dspace:REQUESTED":
      return "info";
    case "dspace:TERMINATED":
      return "danger";
    case "dspace:SUSPENDED":
      return "warning";
  }
}

const action = async (event: Event, action: 'start' | 'complete' | 'terminate' | 'suspend', transfer: TransferDto) => {
  const target = event.currentTarget as HTMLElement;
  target.classList.add('p-disabled');
  target.classList.add('p-button-loading');
  confirm.require({
    header: `Are you sure you want to ${action} this transfer`,
    message: `Changes to the state of this transfer will be communicated with the remote party, this might be irreversible`,
    rejectLabel: 'Cancel',
    acceptLabel: action.charAt(0).toUpperCase() + action.slice(1),
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        let params: Record<string, string> | undefined;
        if (action === 'terminate') {
          params = {
            code: 'USER_INTERVENTION',
            reason: 'Manual user intervention'
          }
        }
        if (action === 'suspend') {
          params = {
            reason: 'Manual user intervention'
          }
        }
        await axiosInstance.post(`management/transfers/${transfer.id}/${action}`, undefined, {
          params
        });
        setTimeout(getTransfers, 1000);
      } catch (err) {
        toast.add({
          severity: "warn",
          summary: `Error during transfer ${action}`,
          detail: `Could not ${action} transfer ${transfer.id}`,
          life: 10000,
        });
      }
      target.classList.remove('p-disabled');
      target.classList.remove('p-button-loading');
    },
    reject: () => {
      target.classList.remove('p-disabled');
      target.classList.remove('p-button-loading');
    }
  });
}

onMounted(async () => {
  await getState();
  await getTransfers();
});
</script>

<template>
  <div>
    <Card>
      <template #title>State</template>
      <template #subtitle>State of this HTTP data plane</template>
      <template #content>
        <div class="grid" v-if="state">
            <div class="col-12 lg:col-8">
            <FormField label="Identifier">{{ state.identifier }}</FormField>
            <FormField label="Type">{{ state.details.dataplaneType }}</FormField>
            <FormField label="Synchronization">{{ state.details.catalogSynchronization }}</FormField>
            <FormField label="Role">{{ state.details.role }}</FormField>
            <FormField label="Dataset ID">{{ state.dataset["@id"] }}</FormField>
          </div>
          <div class="col-12 lg:col-4">
            <div>
              <Button
                icon="pi pi-refresh"
                severity="info"
                label="Refresh state at Control Plane"
              />
            </div>
            <div class="mt-3">
              <Button
                label="Show DCAT dataset"
                @click="showDataset = true"
              />
              <Dialog
                v-model:visible="showDataset"
                modal
                header="DCAT dataset"
                :style="{ width: '90vw', maxWidth: '75rem' }"
              >
                <JsonTreeView
                  :data="JSON.stringify(state.dataset)"
                  color-scheme="dark"
                  root-key="Dataset"
                  :max-depth="5"
                />
              </Dialog>
            </div>
          </div>
        </div>
      </template>
    </Card>
    <Card class="mt-5" v-if="showConsumer">
      <template #title>Consuming Transfers</template>
      <template #subtitle>Transfers executed by this data plane acting as consumer</template>
      <template #content>
        <DataTable
          v-model:expanded-rows="expandedConsumerRows"
          :value="consumerTransfers"
          sort-field="createdDate"
          :sort-order="-1"
          paginator
          :rows="10"
        >
          <Column expander style="width: 5rem" />
          <Column field="remoteId" header="Remote ID">
            <template #body="props">
              {{ props.data.remoteParty }}
            </template>
          </Column>
          <Column field="state" header="State">
            <template #body="props">
              <Tag :severity="stateSeverity(props.data.state)" :value="props.data.state.replace(/^dspace:/,'')"/>
            </template>
          </Column>
          <Column field="createdDate" header="Date">
            <template #body="props">
              {{ new Date(props.data.createdDate).toLocaleString() }}
            </template>
          </Column>
          <Column header="Quick actions">
            <template #body="props">
              <Button icon="pi pi-times" :disabled="['dspace:COMPLETED', 'dspace:TERMINATED'].includes(props.data.state)" severity="danger" aria-label="Stop" outlined @click="action($event, 'terminate', props.data)" />
              <Button v-if="props.data.state === 'dspace:STARTED'" class="ml-2" icon="pi pi-pause" severity="warning" aria-label="Suspend" outlined @click="action($event, 'suspend', props.data)" />
              <Button v-else :disabled="props.data.state !== 'dspace:SUSPENDED'" class="ml-2" icon="pi pi-play" severity="warning" aria-label="Start" outlined @click="action($event, 'start', props.data)" />
              <Button class="ml-2" :disabled="props.data.state !== 'dspace:STARTED'" icon="pi pi-download" severity="info" aria-label="Execute" @click="store.commit('currentTransfer', props.data); $router.push({name: 'tester'})" outlined />
              <Button class="ml-2" :disabled="props.data.state !== 'dspace:STARTED'" icon="pi pi-check" severity="success" aria-label="Complete" outlined @click="action($event, 'complete', props.data)" />
            </template>
          </Column>
          <template #expansion="props">
            <FormField label="Local ID">{{ props.data.id }}</FormField>
            <FormField label="Process ID">{{ props.data.processId }}</FormField>
            <FormField label="Date">{{ new Date(props.data.createdDate).toLocaleString() }}</FormField>
            <FormField label="State"><Tag :severity="stateSeverity(props.data.state)" :value="props.data.state.replace(/^dspace:/,'')"/></FormField>
            <FormField label="Agreement">{{ props.data.request['dspace:agreementId'] }}</FormField>
            <template v-if="props.data.state === 'dspace:STARTED'">
              <h4>Data address</h4>
              <FormField label="Endpoint">{{ props.data.dataAddress['dspace:endpoint'] }}</FormField>
              <FormField label="Properties">
                <div v-for="property in props.data.dataAddress['dspace:endpointProperties']">
                  <strong>{{ property['dspace:name'] }}</strong>: {{ property['dspace:value'] }}
                </div>
              </FormField>
            </template>
          </template>
        </DataTable>
      </template>
    </Card>
    <Card class="mt-5" v-if="showProvider">
      <template #title>Providing Transfers</template>
      <template #subtitle>Transfers executed by this data plane acting as provider</template>
      <template #content>
        <DataTable
          v-model:expanded-rows="expandedProviderRows"
          :value="providerTransfers"
          sort-field="createdDate"
          :sort-order="-1"
          paginator
          :rows="10"
        >
          <Column expander style="width: 5rem" />
          <Column field="remoteId" header="Remote ID">
            <template #body="props">
              {{ props.data.remoteParty }}
            </template>
          </Column>
          <Column field="state" header="State">
            <template #body="props">
              <Tag :severity="stateSeverity(props.data.state)" :value="props.data.state.replace(/^dspace:/,'')"/>
            </template>
          </Column>
          <Column field="createdDate" header="Date">
            <template #body="props">
              {{ new Date(props.data.createdDate).toLocaleString() }}
            </template>
          </Column>
          <Column header="Quick actions">
            <template #body="props">
              <Button icon="pi pi-times" :disabled="['dspace:COMPLETED', 'dspace:TERMINATED'].includes(props.data.state)" severity="danger" aria-label="Terminate" outlined @click="action($event, 'terminate', props.data)" />
              <Button v-if="props.data.state === 'dspace:STARTED'" class="ml-2" icon="pi pi-pause" severity="warning" aria-label="Suspend" outlined @click="action($event, 'suspend', props.data)" />
              <Button v-else :disabled="!['dspace:SUSPENDED', 'dspace:REQUESTED'].includes(props.data.state)" class="ml-2" icon="pi pi-play" severity="warning" aria-label="Start" outlined @click="action($event, 'start', props.data)" />
              <Button class="ml-2" :disabled="props.data.state !== 'dspace:STARTED'" icon="pi pi-check" severity="success" aria-label="Complete" outlined @click="action($event, 'complete', props.data)" />
            </template>
          </Column>
          <template #expansion="props">
            <FormField label="Local ID">{{ props.data.id }}</FormField>
            <FormField label="Process ID">{{ props.data.processId }}</FormField>
            <FormField label="Date">{{ new Date(props.data.createdDate).toLocaleString() }}</FormField>
            <FormField label="State"><Tag :severity="stateSeverity(props.data.state)" :value="props.data.state.replace(/^dspace:/,'')"/></FormField>
            <FormField label="Agreement">{{ props.data.request['dspace:agreementId'] }}</FormField>
          </template>
        </DataTable>
      </template>
    </Card>
  </div>
</template>
<style scoped>
.card-container {
  display: flex;
  flex-wrap: wrap;
}

.card {
  flex: 1 1 auto;
  margin-right: 1rem; /* Adjust margin as needed */
}
</style>
