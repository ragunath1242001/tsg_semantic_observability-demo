<script setup lang="ts">
import { DataPlaneDetailsDto, DatasetDto } from "@tsg-dsp/common-dsp";
import DisplayField from "@tsg-dsp/common-ui/components/DisplayField.vue";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { storeToRefs } from "pinia";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";

const userStore = useUserStore();

import { useDataPlaneStore } from "../stores/dataplane";

const dataPlaneFormDefault: DataPlaneDetailsDto = {
  identifier: "",
  title: "Data Plane",
  dataplaneType: "",
  endpointPrefix: undefined,
  callbackAddress: undefined,
  managementAddress: undefined,
  catalogSynchronization: undefined,
  role: undefined
};

const confirm = useConfirm();
const dataPlaneForm = ref(dataPlaneFormDefault);
const toast = useToast();
const dataPlaneStore = useDataPlaneStore();
const { dataPlanes } = storeToRefs(dataPlaneStore);
const dataPlaneDatasets = ref<{ [key: string]: DatasetDto[] }>({});

const addDataPlane = async () => {
  try {
    await http.post("management/dataplanes", dataPlaneForm.value);
    dataPlaneForm.value = dataPlaneFormDefault;
    toast.add({
      severity: "success",
      summary: "Dataplane added",
      detail: `Dataplane ${dataPlaneForm.value.identifier} successfully added`,
      life: 3000
    });
    await dataPlaneStore.fetchDataPlanes();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to add dataplane",
        defaultMessage: `Could not register new dataplane to the control plane`
      })
    );
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
        await http.delete(
          `management/dataplanes/${encodeURIComponent(dataplaneId)}`
        );
        await dataPlaneStore.fetchDataPlanes();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Dataplane deleted",
          life: 3000
        });
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: "Could not delete dataplane",
            defaultMessage: `Could not delete dataplane`
          })
        );
      }
    }
  });
};

const loadDataPlaneDatasets = async (
  event: MouseEvent,
  dataPlaneId: string
) => {
  try {
    (event.currentTarget as HTMLButtonElement).disabled = true;
    const response = await http.get<DatasetDto[]>(
      `management/dataplanes/${encodeURIComponent(dataPlaneId)}/datasets`,
      {
        params: {
          per_page: 5
        }
      }
    );
    const datasets = response.data;
    dataPlaneDatasets.value[dataPlaneId] = datasets;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to load datasets",
        defaultMessage: `Could not load datasets for dataplane ${dataPlaneId}`
      })
    );
  }
  (event.currentTarget as HTMLButtonElement).disabled = false;
};

const initialize = async () => {
  await dataPlaneStore.fetchDataPlanes();
};
onMounted(async () => {
  await initialize();
});
</script>
<template>
  <Card class="mb-8">
    <template #title>Dataplanes</template>
    <template #content
      >On this page you can find the dataplanes that are linked to this Control
      Plane. If you have the required roles, there is also an option to delete
      or add dataplanes in this view.</template
    >
  </Card>
  <Card
    v-for="dataplane in dataPlanes"
    :key="dataplane.identifier"
    class="mb-8">
    <template #title>
      <div class="grid grid-cols-12 gap-4 mb-0">
        <div class="col-span-11 lg:col-span-8 mb-0">
          {{ dataplane.title }}
        </div>
        <div class="col-span-1 mb-0">
          <Button
            severity="danger"
            icon="pi pi-trash"
            @click="deleteDataPlane(dataplane.identifier)" />
        </div></div
    ></template>
    <template #content>
      <div v-if="dataplane" class="grid flex-wrap grid-cols-12 gap-4">
        <DisplayField label="Identifier">{{
          dataplane.identifier
        }}</DisplayField>
        <DisplayField label="Type">{{ dataplane.dataplaneType }}</DisplayField>
        <DisplayField label="Synchronization">{{
          dataplane.catalogSynchronization
        }}</DisplayField>
        <DisplayField label="Role">{{ dataplane.role }}</DisplayField>
        <DisplayField label="Endpoint Prefix">{{
          dataplane.endpointPrefix
        }}</DisplayField>
        <DisplayField label="Callback Address">{{
          dataplane.callbackAddress
        }}</DisplayField>
        <DisplayField label="Management Address">{{
          dataplane.managementAddress
        }}</DisplayField>
        <DisplayField label="Dataset Titles">
          <template v-if="dataPlaneDatasets[dataplane.identifier]">
            <ul>
              <li
                v-for="dataset in dataPlaneDatasets[dataplane.identifier]"
                :key="dataset['@id']">
                {{ dataset.title }}
              </li>
            </ul>
          </template>
          <template v-else>
            <Button
              label="Load first 5 datasets"
              severity="secondary"
              @click="loadDataPlaneDatasets($event, dataplane.identifier)" />
          </template>
        </DisplayField>
      </div>
    </template>
  </Card>
  <Card v-if="!userStore.isReadOnly">
    <template #title>Add Data Plane</template>
    <template #subtitle> Link a data plane to this Control Plane </template>
    <template #content>
      <form class="flex flex-col gap-4" @submit.prevent="addDataPlane">
        <FormField v-slot="props" label="Type">
          <InputText
            :id="props.id"
            v-model="dataPlaneForm.dataplaneType"
            class="w-full"
            placeholder="Type of data plane you are using, e.g. tsg:HTTP"
            required></InputText>
        </FormField>
        <FormField v-slot="props" label="Title">
          <InputText
            :id="props.id"
            v-model="dataPlaneForm.title"
            class="w-full"
            placeholder="Title of the data plane"
            required></InputText>
        </FormField>
        <FormField v-slot="props" label="Identifier">
          <InputText
            :id="props.id"
            v-model="dataPlaneForm.identifier"
            class="w-full"
            placeholder="Identifier"></InputText>
        </FormField>
        <FormField v-slot="props" label="Endpoint Prefix">
          <InputText
            :id="props.id"
            v-model="dataPlaneForm.endpointPrefix"
            class="w-full"
            placeholder="Endpoint Prefix"></InputText>
        </FormField>
        <FormField v-slot="props" label="Callback Address">
          <InputText
            :id="props.id"
            v-model="dataPlaneForm.callbackAddress"
            class="w-full"
            placeholder="Callback Address"></InputText>
        </FormField>
        <FormField v-slot="props" label="Management Address">
          <InputText
            :id="props.id"
            v-model="dataPlaneForm.managementAddress"
            class="w-full"
            placeholder="Management Address"></InputText>
        </FormField>
        <FormField label="Catalog Synchronization">
          <SelectButton
            v-model="dataPlaneForm.catalogSynchronization"
            required
            :options="['push', 'pull']"></SelectButton>
        </FormField>
        <FormField label="Role">
          <SelectButton
            v-model="dataPlaneForm.role"
            required
            :options="['consumer', 'provider', 'both']"></SelectButton>
        </FormField>
        <FormField no-label class="mt-8">
          <Button label="Add Dataplane" severity="success" type="submit" />
        </FormField>
      </form>
    </template>
  </Card>
</template>
