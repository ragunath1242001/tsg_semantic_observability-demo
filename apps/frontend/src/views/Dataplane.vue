<script setup lang="ts">
import { CatalogDto } from "@tsg-dsp/common";
import http from "../utils/http";
import { DataPlaneDto } from "@libs/dtos";
import { onMounted, ref, setDevtoolsHook } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import FormField from "../components/FormField.vue";
import { axiosInstance } from "../stores";

const dataplanes = ref<DataPlaneDto[]>();

const dataPlaneFormDefault: DataPlaneDto = {
  identifier: "",
  dataplaneType: "",
  endpointPrefix: undefined,
  callbackAddress: undefined,
  managementAddress: undefined,
  managementToken: undefined,
  catalogSynchronization: undefined,
  role: undefined,
};

const confirm = useConfirm();
const dataPlaneForm = ref(dataPlaneFormDefault);
const toast = useToast();

const getDataPlanes = async () => {
  try {
    const response = await http.get<DataPlaneDto[]>("management/dataplanes");
    dataplanes.value = response.data;
    return dataplanes;
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Failed to get dataplanes",
      detail: `${e.response.data.message}`,
      life: 3000,
    });
  }
};

const addDataPlane = async () => {
  try {
    await axiosInstance.post("management/dataplanes", dataPlaneForm.value);
    dataPlaneForm.value = dataPlaneFormDefault;
    toast.add({
      severity: "success",
      summary: "Dataplane added",
      detail: `Dataplane ${dataPlaneForm.value.identifier} successfully added`,
      life: 3000,
    });
    await getDataPlanes();
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "API Error",
      detail: "Could not add dataplane",
      life: 3000,
    });
  }
};

const deleteDataPlane = async (dataplaneId: string) => {
  confirm.require({
    header: "Are you sure you want to delete this dataplane?",
    message: "This dataplane might be used by other parties!",
    icon: "pi pi-info-circle",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await axiosInstance.delete(
          `management/dataplanes/${encodeURIComponent(dataplaneId)}`
        );
        await getDataPlanes();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Dataplane deleted",
          life: 3000,
        });
      } catch (err) {
        const message =
          err.response?.data?.message || "Could not delete dataplane";
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

const initialize = async () => {
  getDataPlanes();
};
onMounted(async () => {
  await initialize();
});
</script>
<template>
  <Card
    v-for="dataplane in dataplanes"
    :key="dataplane.identifier"
    class="mb-2"
  >
    <template #title>
      <div class="grid mb-0">
        <div class="col-11 lg:col-8 mb-0">
          {{ dataplane.identifier }}
        </div>
        <div class="col-1 mb-0">
          <Button
            severity="danger"
            icon="pi pi-trash"
            @click="deleteDataPlane(dataplane.identifier)"
          />
        </div></div
    ></template>
    <template #content>
      <div class="grid" v-if="dataplane">
        <div class="col-11 lg:col-8">
          <FormField label="Identifier">{{ dataplane.identifier }}</FormField>
          <FormField label="Type">{{ dataplane.dataplaneType }}</FormField>
          <FormField label="Synchronization">{{
            dataplane.catalogSynchronization
          }}</FormField>
          <FormField label="Role">{{ dataplane.role }}</FormField>
          <FormField label="Endpoint Prefix">{{
            dataplane.endpointPrefix
          }}</FormField>
          <FormField label="Callback Address">{{
            dataplane.callbackAddress
          }}</FormField>
          <FormField label="Management Address">{{
            dataplane.managementAddress
          }}</FormField>
          <FormField label="Dataset ID">{{
            dataplane.datasets.map((dataset) => dataset["@id"]).join(", ")
          }}</FormField>
        </div>
      </div>
    </template>
  </Card>
  <Card class="mt-5">
    <template #title>Add Data Plane</template>
    <template #subtitle> Link a data plane to this Control Plane </template>
    <template #content>
      <form @submit.prevent="addDataPlane">
        <FormField label="Type" v-slot="props">
          <InputText
            :id="props.id"
            class="w-full"
            v-model="dataPlaneForm.catalogSynchronization"
            placeholder="Type of data plane you are using, e.g. dspace:HTTP"
            required
          ></InputText>
        </FormField>
        <FormField label="Identifier" v-slot="props">
          <InputText
            :id="props.id"
            class="w-full"
            v-model="dataPlaneForm.identifier"
            placeholder="Identifier"
          ></InputText>
        </FormField>
        <FormField label="Endpoint Prefix" v-slot="props">
          <InputText
            :id="props.id"
            class="w-full"
            v-model="dataPlaneForm.endpointPrefix"
            placeholder="Endpoint Prefix"
          ></InputText>
        </FormField>
        <FormField label="Callback Address" v-slot="props">
          <InputText
            :id="props.id"
            class="w-full"
            v-model="dataPlaneForm.callbackAddress"
            placeholder="Callback Address"
          ></InputText>
        </FormField>
        <FormField label="Management Address" v-slot="props">
          <InputText
            :id="props.id"
            class="w-full"
            v-model="dataPlaneForm.managementAddress"
            placeholder="Management Address"
          ></InputText>
        </FormField>
        <FormField label="Management Token" v-slot="props">
          <InputText
            :id="props.id"
            class="w-full"
            v-model="dataPlaneForm.managementToken"
            placeholder="Management Token"
          ></InputText>
        </FormField>
        <FormField label="Catalog Synchronization" v-slot="props">
          <SelectButton
            v-model="dataPlaneForm.dataplaneType"
            required
            :options="['push', 'pull']"
          ></SelectButton>
        </FormField>
        <FormField label="Role" v-slot="props">
          <SelectButton
            v-model="dataPlaneForm.role"
            required
            :options="['consumer', 'provider', 'both']"
          ></SelectButton>
        </FormField>
        <FormField no-label class="mt-5">
          <Button label="Add Dataplane" severity="success" type="submit" />
        </FormField>
      </form>
    </template>
  </Card>
</template>
