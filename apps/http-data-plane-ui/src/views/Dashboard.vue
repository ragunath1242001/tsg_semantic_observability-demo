<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { DataPlaneStateDto, TransferDto } from "@tsg-dsp/common-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { formatDate } from "@tsg-dsp/common-ui/utils/date";
import PaginatedLogTable from "../components/PaginatedLogTable.vue";
import router from "../router";
import http from "@tsg-dsp/common-ui/utils/http";
import { useTransferStore } from "../stores/transfer";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

const toast = useToast();
const confirm = useConfirm();

const transferStore = useTransferStore();

const showDataset = ref(false);
const state = ref<DataPlaneStateDto>();
const transfers = ref<TransferDto[]>();
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
const expandedConsumerRows = ref();
const expandedProviderRows = ref();

const getState = async () => {
  try {
    const response = await http.get<DataPlaneStateDto>("management/state");
    state.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading state failed",
        defaultMessage: `Could not load state from the HTTP data plane`
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
        defaultMessage: `Could not load transfers from the HTTP data plane`
      })
    );
  }
};

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
      return "warn";
  }
};

const action = async (
  event: Event,
  action: "start" | "complete" | "terminate" | "suspend",
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
        await http.post(
          `management/transfers/${transfer.id}/${action}`,
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

const showLogs = (transfer: TransferDto) => {
  logModal.value = {
    type: transfer.role === "consumer" ? "egress" : "ingress",
    transfer: transfer.id
  };
  showLogModal.value = true;
};
const showLogModal = ref(false);
const logModal = ref<{ type: "ingress" | "egress"; transfer: string }>();

onMounted(async () => {
  await getState();
  await getTransfers();
});
</script>

<template>
  <Dialog
    :dismissableMask="true"
    :style="{ width: '90vw', maxWidth: '100rem' }"
    v-model:visible="showLogModal"
    @hide="logModal = undefined"
    modal>
    <template #header>
      <span class="p-dialog-title" data-pc-section="title"
        ><span class="capitalize">{{ logModal.type }}</span> logs for transfer
        {{ logModal.transfer }}</span
      >
    </template>
    <PaginatedLogTable
      v-if="logModal"
      :type="logModal.type"
      :transferId="logModal.transfer" />
  </Dialog>
  <Card>
    <template #title>State</template>
    <template #subtitle>State of this HTTP data plane</template>
    <template #content>
      <div class="flex flex-col gap-4" v-if="state">
        <FormField :labelWidth="3" label="Identifier">{{
          state.identifier
        }}</FormField>
        <FormField :labelWidth="3" label="Type">{{
          state.details.dataplaneType
        }}</FormField>
        <FormField :labelWidth="3" label="Synchronization">{{
          state.details.catalogSynchronization
        }}</FormField>
        <FormField :labelWidth="3" label="Role">{{
          state.details.role
        }}</FormField>
        <FormField :labelWidth="3" label="Dataset IDs">
          <div v-for="dataset in state.dataset">
            {{ dataset["@id"] }}
          </div>
        </FormField>
      </div>
    </template>
  </Card>
  <Card class="mt-8" v-if="showConsumer">
    <template #title>Consuming Transfers</template>
    <template #subtitle
      >Transfers executed by this data plane acting as consumer</template
    >
    <template #content>
      <DataTable
        v-model:expanded-rows="expandedConsumerRows"
        :value="consumerTransfers"
        sort-field="createdDate"
        :sort-order="-1"
        paginator
        :rows="10">
        <Column expander style="width: 5rem" />
        <Column field="remoteId" header="Remote ID">
          <template #body="props">
            {{ props.data.remoteParty }}
          </template>
        </Column>
        <Column field="state" header="State">
          <template #body="props">
            <Tag
              :severity="stateSeverity(props.data.state)"
              :value="props.data.state.replace(/^dspace:/, '')" />
          </template>
        </Column>
        <Column field="createdDate" header="Date">
          <template #body="props">
            {{ new Date(props.data.createdDate).toLocaleString() }}
          </template>
        </Column>
        <Column header="Quick actions">
          <template #body="props">
            <Button
              icon="pi pi-times"
              :disabled="
                ['dspace:COMPLETED', 'dspace:TERMINATED'].includes(
                  props.data.state
                )
              "
              class="mr-2 mb-1"
              severity="danger"
              aria-label="Stop"
              outlined
              @click="action($event, 'terminate', props.data)"
              v-tooltip.bottom="'Terminate'" />
            <Button
              v-if="props.data.state === 'dspace:STARTED'"
              class="mr-2 mb-1"
              icon="pi pi-pause"
              severity="warn"
              aria-label="Suspend"
              outlined
              @click="action($event, 'suspend', props.data)"
              v-tooltip.bottom="'Suspend'" />
            <Button
              v-else
              :disabled="props.data.state !== 'dspace:SUSPENDED'"
              class="mr-2 mb-1"
              icon="pi pi-play"
              severity="warn"
              aria-label="Start"
              outlined
              @click="action($event, 'start', props.data)"
              v-tooltip.bottom="'Start'" />
            <Button
              class="mr-2 mb-1"
              :disabled="props.data.state !== 'dspace:STARTED'"
              icon="pi pi-download"
              severity="info"
              aria-label="Execute"
              @click="
                transferStore.transfer = props.data;
                router.push({
                  name: 'tester',
                  params: { id: props.data.id }
                });
              "
              v-tooltip.bottom="'Execute'"
              outlined />
            <Button
              class="mr-2 mb-1"
              :disabled="props.data.state !== 'dspace:STARTED'"
              icon="pi pi-check"
              severity="success"
              aria-label="Complete"
              outlined
              @click="action($event, 'complete', props.data)"
              v-tooltip.bottom="'Complete'" />
            <Button
              class="mr-2 mb-1"
              icon="pi pi-list"
              severity="help"
              aria-label="Logs"
              outlined
              @click="showLogs(props.data)"
              v-tooltip.bottom="'Logs'" />
          </template>
        </Column>
        <template #expansion="props">
          <div class="flex flex-col gap-4">
            <FormField label="Local ID">{{ props.data.id }}</FormField>
            <FormField label="Process ID">{{ props.data.processId }}</FormField>
            <FormField label="Date">{{
              new Date(props.data.createdDate).toLocaleString()
            }}</FormField>
            <FormField label="State">
              <Tag
                :severity="stateSeverity(props.data.state)"
                :value="props.data.state.replace(/^dspace:/, '')" />
            </FormField>
            <FormField label="Agreement">{{
              props.data.request["dspace:agreementId"]
            }}</FormField>
            <FormField label="Dataset ID">{{ props.data.datasetId }}</FormField>
          </div>
          <template v-if="props.data.state === 'dspace:STARTED'">
            <div class="text-xl my-2">Data address</div>
            <div class="flex flex-col gap-4">
              <FormField label="Endpoint">{{
                props.data.dataAddress["dspace:endpoint"]
              }}</FormField>
              <FormField label="Properties">
                <div
                  v-for="property in props.data.dataAddress[
                    'dspace:endpointProperties'
                  ]">
                  <strong>{{ property["dspace:name"] }}</strong
                  >: {{ property["dspace:value"] }}
                </div>
              </FormField>
            </div>
          </template>
        </template>
      </DataTable>
    </template>
  </Card>
  <Card class="mt-8" v-if="showProvider">
    <template #title>Providing Transfers</template>
    <template #subtitle
      >Transfers executed by this data plane acting as provider</template
    >
    <template #content>
      <DataTable
        v-model:expanded-rows="expandedProviderRows"
        :value="providerTransfers"
        sort-field="createdDate"
        :sort-order="-1"
        paginator
        :rows="10">
        <Column expander style="width: 5rem" />
        <Column field="remoteId" header="Remote ID">
          <template #body="props">
            {{ props.data.remoteParty }}
          </template>
        </Column>
        <Column field="state" header="State">
          <template #body="props">
            <Tag
              :severity="stateSeverity(props.data.state)"
              :value="props.data.state.replace(/^dspace:/, '')" />
          </template>
        </Column>
        <Column field="createdDate" header="Date">
          <template #body="props">
            {{ new Date(props.data.createdDate).toLocaleString() }}
          </template>
        </Column>
        <Column header="Quick actions">
          <template #body="props">
            <Button
              icon="pi pi-times"
              :disabled="
                ['dspace:COMPLETED', 'dspace:TERMINATED'].includes(
                  props.data.state
                )
              "
              severity="danger"
              aria-label="Terminate"
              outlined
              @click="action($event, 'terminate', props.data)"
              v-tooltip.bottom="'Terminate'" />
            <Button
              v-if="props.data.state === 'dspace:STARTED'"
              class="ml-2"
              icon="pi pi-pause"
              severity="warn"
              aria-label="Suspend"
              outlined
              @click="action($event, 'suspend', props.data)"
              v-tooltip.bottom="'Suspend'" />
            <Button
              v-else
              :disabled="
                !['dspace:SUSPENDED', 'dspace:REQUESTED'].includes(
                  props.data.state
                )
              "
              class="ml-2"
              icon="pi pi-play"
              severity="warn"
              aria-label="Start"
              outlined
              @click="action($event, 'start', props.data)"
              v-tooltip.bottom="'Start'" />
            <Button
              class="ml-2"
              :disabled="props.data.state !== 'dspace:STARTED'"
              icon="pi pi-check"
              severity="success"
              aria-label="Complete"
              outlined
              @click="action($event, 'complete', props.data)"
              v-tooltip.bottom="'Complete'" />
            <Button
              class="ml-2"
              icon="pi pi-list"
              severity="help"
              aria-label="Logs"
              outlined
              @click="showLogs(props.data)"
              v-tooltip.bottom="'Logs'" />
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
              :value="props.data.state.replace(/^dspace:/, '')" />
          </FormField>
          <FormField label="Agreement">{{
            props.data.request["dspace:agreementId"]
          }}</FormField>
          <FormField label="Dataset ID">{{ props.data.datasetId }}</FormField>
        </template>
      </DataTable>
    </template>
  </Card>
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
