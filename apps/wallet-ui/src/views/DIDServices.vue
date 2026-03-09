<script setup lang="ts">
import { Action, Resource } from "@tsg-dsp/common-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { formatRelative } from "@tsg-dsp/common-ui/utils/date";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { setupPagination } from "@tsg-dsp/common-ui/utils/pagination";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

interface DIDService {
  id: string;
  type: string;
  serviceEndpoint: string;
}

const toast = useToast();
const confirm = useConfirm();

const userStore = useUserStore();
const canDeleteDIDService = computed(() =>
  userStore.canAccessRoute(Action.DELETE, Resource.W_DID)
);
const canCreateDIDService = computed(() =>
  userStore.canAccessRoute(Action.CREATE, Resource.W_DID)
);

const serviceForm = ref<DIDService>({
  id: `${userStore.user?.didId}#`,
  type: "",
  serviceEndpoint: ""
});

const { data, loading, total, perPage, load } = setupPagination({
  fetch: async (params) => {
    return http<DIDService[]>("management/did/services", { params });
  },
  errorContext: {
    summary: "Could not load DID services",
    defaultMessage: `Error in fetching registered DID services`
  },
  toast
});

const deleteService = async (serviceId: string) => {
  confirm.require({
    header: "Are you sure you want to delete this service?",
    message:
      "This service might be used by other parties to find relevant endpoints!",
    icon: "pi pi-info-circle",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await http.delete(
          `management/did/services/${encodeURIComponent(serviceId)}`
        );
        await load();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Service deleted",
          life: 3000
        });
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: "Could not delete service",
            defaultMessage: `Error in deleting DID service`
          })
        );
      }
    }
  });
};

const addService = async () => {
  try {
    await http.post("management/did/services", serviceForm.value);
    await load();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Service added",
      life: 3000
    });
    serviceForm.value = {
      id: `${userStore.user?.didId}#`,
      type: "",
      serviceEndpoint: ""
    };
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not add service",
        defaultMessage: `Error in registering DID service`
      })
    );
  }
};

onMounted(async () => {
  await load();
});
</script>

<template>
  <div>
    <Card>
      <template #title>DID Services</template>
      <template #subtitle>
        <p>
          Services are used in DID documents to express ways of communicating
          with the DID subject or associated entities. A service can be any type
          of service the DID subject wants to advertise, including decentralized
          identity management services for further discovery, authentication,
          authorization, or interaction.
        </p>
        <p>
          The table below show the current DID services registered for this
          Wallet instance.
        </p>
      </template>
      <template #content>
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
          <Column field="id" class="break-all" header="ID" sortable />
          <Column field="type" header="Type" sortable />
          <Column
            field="serviceEndpoint"
            class="break-all"
            header="Service Endpoint"
            sortable />
          <Column field="createdDate" header="Created" sortable>
            <template #body="props">
              {{ formatRelative(props.data.createdDate) }}
            </template>
          </Column>
          <Column field="updatedDate" header="Updated" sortable>
            <template #body="props">
              {{ formatRelative(props.data.updatedDate) }}
            </template>
          </Column>
          <Column v-if="canDeleteDIDService" field="actions" header="Actions">
            <template #body="props">
              <Button
                severity="danger"
                icon="pi pi-times"
                @click="deleteService(props.data.id)" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
    <Card v-if="canCreateDIDService" class="mt-8">
      <template #title>Add service</template>
      <template #subtitle>
        <p>
          Create a new service entry in the Wallet's DID document. In order to
          maximize interoperability, the service type and its associated
          properties SHOULD be registered in the
          <a
            href="https://www.w3.org/TR/did-spec-registries/#service-types"
            target="_blank"
            >DID Specification Registries</a
          >.
        </p>
      </template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="addService">
          <FormField v-slot="props" label="Service ID">
            <InputText
              :id="props.id"
              v-model="serviceForm.id"
              class="w-full"
              :placeholder="`${userStore.user?.didId}#`" />
          </FormField>
          <FormField v-slot="props" label="Service Type">
            <InputText
              :id="props.id"
              v-model="serviceForm.type"
              class="w-full" />
          </FormField>
          <FormField v-slot="props" label="Service Endpoint">
            <InputText
              :id="props.id"
              v-model="serviceForm.serviceEndpoint"
              class="w-full"
              placeholder="https://..." />
          </FormField>
          <FormField no-label>
            <Button label="Add service" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>
