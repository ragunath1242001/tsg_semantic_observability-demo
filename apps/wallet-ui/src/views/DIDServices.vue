<script setup lang="ts">
import { onMounted, ref } from "vue";
import { KeyInfo } from "@libs/wallet-dtos";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import FormField from "@libs/common-ui/components/FormField.vue";
import { axiosInstance, store } from "../store/index.js";

interface DIDService {
  id: string;
  type: string;
  serviceEndpoint: string;
}

const toast = useToast();
const confirm = useConfirm();

const services = ref<DIDService[]>([]);
const serviceForm = ref<DIDService>({
  id: `${store.state.user?.didId}#`,
  type: "",
  serviceEndpoint: "",
});

const loadServices = async () => {
  try {
    const response = await axiosInstance<DIDService[]>(
      "management/did/services"
    );
    services.value = response.data;
  } catch (err) {
    const message =
      err.response?.data?.message || "Could not load DID services";
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: message,
      life: 10000,
    });
  }
};

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
        await axiosInstance.delete(
          `management/did/services/${encodeURIComponent(serviceId)}`
        );
        await loadServices();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Service deleted",
          life: 3000,
        });
      } catch (err) {
        const message =
          err.response?.data?.message || "Could not delete service";
        toast.add({
          severity: "warn",
          summary: "API error",
          detail: message,
          life: 10000,
        });
      }
    },
  });
};

const addService = async () => {
  try {
    await axiosInstance.post("management/did/services", serviceForm.value);
    await loadServices();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Service added",
      life: 3000,
    });
    serviceForm.value = {
      id: `${store.state.user?.didId}#`,
      type: "",
      serviceEndpoint: "",
    };
  } catch (err) {
    console.log(err);
    const message = err.response?.data?.message || "Could not add service";
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: message,
      life: 10000,
    });
  }
};

onMounted(async () => {
  await loadServices();
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
          :value="services"
          sort-field="id"
          :sort-order="1"
          paginator
          :rows="10"
        >
          <Column field="id" header="ID" />
          <Column field="type" header="Type" />
          <Column field="serviceEndpoint" header="Service Endpoint" />
          <Column field="actions" header="Actions">
            <template #body="props">
              <Button
                severity="danger"
                icon="pi pi-times"
                @click="deleteService(props.data.id)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
    <Card class="mt-5">
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
        <form @submit.prevent="addService">
          <FormField label="Service ID" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="serviceForm.id"
              :placeholder="`${store.state.user?.didId}#`"
            />
          </FormField>
          <FormField label="Service Type" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="serviceForm.type"
            />
          </FormField>
          <FormField label="Service Endpoint" v-slot="props">
            <InputText
              :id="props.id"
              class="w-full"
              v-model="serviceForm.serviceEndpoint"
              placeholder="https://..."
            />
          </FormField>
          <FormField no-label>
            <Button label="Add service" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>
