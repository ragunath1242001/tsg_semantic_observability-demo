<script setup lang="ts">
import type {
  ProjectAgreementDetailDto,
  ProjectAgreementDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref, watch } from "vue";

import { ProjectAgreementsService } from "../../services/ProjectAgreementsService";
import { useRegistryStore } from "../../stores/registry";

const emit = defineEmits<{
  (e: "cancel"): void;
  (e: "created", agreement: ProjectAgreementDetailDto): void;
}>();

const toast = useToast();
const registryStore = useRegistryStore();
const loading = ref(false);
const submitted = ref(false);

const validFromDate = ref<Date>(new Date());
const validUntilDate = ref<Date>(
  new Date(new Date().setMonth(new Date().getMonth() + 3))
);

const selectedParticipantDids = ref<string[]>([]);
const participantDetails = ref<Record<string, { title: string }>>({});

const formData = ref<Omit<ProjectAgreementDto, "validFrom" | "validUntil">>({
  id: "",
  title: "",
  description: "",
  purpose: "",
  researchQuestion: "",
  participants: [],
  objectives: [""],
  hypotheses: [""],
  dataUseConditions: [""],
  securityMeasures: [""],
  complianceRequirements: [""]
});

const availableParticipants = computed(() => {
  return registryStore.participants;
});

watch(
  selectedParticipantDids,
  (newDids, oldDids) => {
    newDids.forEach(async (did) => {
      if (!participantDetails.value[did]) {
        registryStore
          .fetchParticipantCatalog(did)
          .then((catalog) => {
            participantDetails.value[did] = {
              title: catalog.title
            };
          })
          .catch(() => {
            participantDetails.value[did] = {
              title: ""
            };
          });
      }
    });

    if (oldDids) {
      oldDids.forEach((did) => {
        if (!newDids.includes(did)) {
          delete participantDetails.value[did];
        }
      });
    }
  },
  { deep: true }
);

const addArrayItem = (
  field: keyof Pick<
    ProjectAgreementDto,
    | "objectives"
    | "hypotheses"
    | "dataUseConditions"
    | "securityMeasures"
    | "complianceRequirements"
  >
) => {
  (formData.value[field] as string[]).push("");
};

const removeArrayItem = (
  field: keyof Pick<
    ProjectAgreementDto,
    | "objectives"
    | "hypotheses"
    | "dataUseConditions"
    | "securityMeasures"
    | "complianceRequirements"
  >,
  index: number
) => {
  (formData.value[field] as string[]).splice(index, 1);
};

const validateForm = (): boolean => {
  if (!formData.value.title || !formData.value.description) {
    return false;
  }
  if (!validFromDate.value || !validUntilDate.value) {
    return false;
  }
  if (!formData.value.purpose || !formData.value.researchQuestion) {
    return false;
  }
  if (selectedParticipantDids.value.length === 0) {
    return false;
  }
  for (const did of selectedParticipantDids.value) {
    const details = participantDetails.value[did];
    if (!details || !details.title) {
      return false;
    }
  }
  return true;
};

const handleSubmit = async () => {
  submitted.value = true;

  if (!validateForm()) {
    toast.add({
      severity: "error",
      summary: "Validation Error",
      detail: "Please fill in all required fields",
      life: 3000
    });
    return;
  }

  const projectAgreement: ProjectAgreementDto = {
    ...formData.value,
    validFrom: validFromDate.value!.toISOString(),
    validUntil: validUntilDate.value!.toISOString(),
    participants: selectedParticipantDids.value.map((did) => ({
      didId: did,
      title: participantDetails.value[did]?.title ?? did
    })),
    objectives: formData.value.objectives.filter((o) => o.trim()),
    hypotheses: formData.value.hypotheses.filter((h) => h.trim()),
    dataUseConditions: formData.value.dataUseConditions.filter((d) => d.trim()),
    securityMeasures: formData.value.securityMeasures.filter((s) => s.trim()),
    complianceRequirements: formData.value.complianceRequirements.filter((c) =>
      c.trim()
    )
  };

  loading.value = true;
  try {
    const result = await ProjectAgreementsService.create(projectAgreement);
    emit("created", result);
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Creating project agreement failed",
        defaultMessage: `Could not create project agreement`
      })
    );
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  formData.value.id = crypto.randomUUID();
  await registryStore.initialize();
});
</script>

<template>
  <div>
    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <label for="id">Project ID</label>
          <InputText
            id="id"
            v-model="formData.id"
            disabled
            placeholder="Auto-generated UUID" />
          <small class="text-surface-500 dark:text-surface-400"
            >ID is automatically generated</small
          >
        </div>

        <div class="flex flex-col gap-2">
          <label for="title">Title</label>
          <InputText
            id="title"
            v-model="formData.title"
            :invalid="submitted && !formData.title"
            placeholder="Project title" />
          <small v-if="submitted && !formData.title" class="text-red-500"
            >Title is required.</small
          >
        </div>

        <div class="flex flex-col gap-2">
          <label for="description">Description</label>
          <Textarea
            id="description"
            v-model="formData.description"
            :invalid="submitted && !formData.description"
            rows="4"
            placeholder="Detailed project description" />
          <small v-if="submitted && !formData.description" class="text-red-500"
            >Description is required.</small
          >
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label for="validFrom">Valid From</label>
            <DatePicker
              id="validFrom"
              v-model="validFromDate"
              fluid
              :invalid="submitted && !validFromDate"
              show-icon
              date-format="yy-mm-dd" />
            <small v-if="submitted && !validFromDate" class="text-red-500"
              >Valid from date is required.</small
            >
          </div>

          <div class="flex flex-col gap-2">
            <label for="validUntil">Valid Until</label>
            <DatePicker
              id="validUntil"
              v-model="validUntilDate"
              :invalid="submitted && !validUntilDate"
              show-icon
              fluid
              date-format="yy-mm-dd" />
            <small v-if="submitted && !validUntilDate" class="text-red-500"
              >Valid until date is required.</small
            >
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label for="purpose">Purpose</label>
          <InputText
            id="purpose"
            v-model="formData.purpose"
            :invalid="submitted && !formData.purpose"
            placeholder="Purpose of the project" />
          <small v-if="submitted && !formData.purpose" class="text-red-500"
            >Purpose is required.</small
          >
        </div>

        <div class="flex flex-col gap-2">
          <label for="researchQuestion">Research Question</label>
          <Textarea
            id="researchQuestion"
            v-model="formData.researchQuestion"
            :invalid="submitted && !formData.researchQuestion"
            rows="3"
            placeholder="Research question being addressed" />
          <small
            v-if="submitted && !formData.researchQuestion"
            class="text-red-500"
            >Research question is required.</small
          >
        </div>
      </div>

      <Divider />
      <h3 class="text-xl font-semibold">Participants</h3>
      <p class="text-color-secondary">
        Select participants from the registry to include in this project
        agreement.
      </p>
      <Message v-if="registryStore.loading" severity="info">
        Loading participants from registry...
      </Message>
      <Message v-else-if="registryStore.error" severity="warn">
        {{ registryStore.error }}
      </Message>

      <div class="flex flex-col gap-2">
        <label for="participant-multiselect"
          >Select Participants from Registry</label
        >
        <MultiSelect
          id="participant-multiselect"
          v-model="selectedParticipantDids"
          :options="availableParticipants"
          option-label="didId"
          option-value="didId"
          placeholder="Select participants"
          :invalid="submitted && selectedParticipantDids.length === 0"
          display="chip"
          filter
          :max-selected-labels="3">
          <template #option="slotProps">
            <div class="flex flex-col">
              <span class="font-semibold">{{ slotProps.option.didId }}</span>
              <small class="text-surface-500 dark:text-surface-400">{{
                slotProps.option.address
              }}</small>
            </div>
          </template>
        </MultiSelect>
        <small
          v-if="submitted && selectedParticipantDids.length === 0"
          class="text-red-500"
          >At least one participant is required.</small
        >
        <small class="text-surface-500 dark:text-surface-400"
          >Selected: {{ selectedParticipantDids.length }} participant(s)</small
        >
      </div>

      <div
        v-if="selectedParticipantDids.length > 0"
        class="flex flex-col gap-3 mt-4">
        <h4 class="text-lg font-semibold">Participant Details</h4>
        <div
          v-for="(did, index) in selectedParticipantDids"
          :key="did"
          class="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
          <div class="flex flex-col gap-3">
            <div>
              <strong class="text-sm">DID:</strong>
              <p
                class="text-sm break-all mt-1 text-surface-700 dark:text-surface-300">
                {{ did }}
              </p>
            </div>
            <div class="flex flex-col gap-2">
              <label :for="`participant-title-${index}`">Title:</label>
              <InputText
                :id="`participant-title-${index}`"
                v-model="participantDetails[did].title"
                disabled
                placeholder="Participant title" />
            </div>
          </div>
        </div>
      </div>

      <Divider />
      <h3 class="text-xl font-semibold">Objectives</h3>
      <div
        v-for="(objective, index) in formData.objectives"
        :key="index"
        class="flex items-end gap-2">
        <div class="flex-1">
          <InputText
            v-model="formData.objectives[index]"
            placeholder="Objective"
            fluid />
        </div>
        <Button
          v-if="formData.objectives.length > 1"
          icon="pi pi-trash"
          severity="danger"
          text
          @click="removeArrayItem('objectives', index)" />
      </div>
      <Button
        label="Add Objective"
        icon="pi pi-plus"
        severity="secondary"
        text
        @click="addArrayItem('objectives')" />
      <Divider />
      <h3 class="text-xl font-semibold">Hypotheses</h3>
      <div
        v-for="(hypothesis, index) in formData.hypotheses"
        :key="index"
        class="flex items-end gap-2">
        <div class="flex-1">
          <InputText
            v-model="formData.hypotheses[index]"
            fluid
            placeholder="Hypothesis" />
        </div>
        <Button
          v-if="formData.hypotheses.length > 1"
          icon="pi pi-trash"
          severity="danger"
          text
          @click="removeArrayItem('hypotheses', index)" />
      </div>
      <Button
        label="Add Hypothesis"
        icon="pi pi-plus"
        severity="secondary"
        text
        @click="addArrayItem('hypotheses')" />

      <Divider />
      <h3 class="text-xl font-semibold">Data Use Conditions</h3>
      <div
        v-for="(condition, index) in formData.dataUseConditions"
        :key="index"
        class="flex items-end gap-2">
        <div class="flex-1">
          <InputText
            v-model="formData.dataUseConditions[index]"
            fluid
            placeholder="Data use condition" />
        </div>
        <Button
          v-if="formData.dataUseConditions.length > 1"
          icon="pi pi-trash"
          severity="danger"
          text
          @click="removeArrayItem('dataUseConditions', index)" />
      </div>
      <Button
        label="Add Condition"
        icon="pi pi-plus"
        severity="secondary"
        text
        @click="addArrayItem('dataUseConditions')" />

      <Divider />
      <h3 class="text-xl font-semibold">Security Measures</h3>
      <div
        v-for="(measure, index) in formData.securityMeasures"
        :key="index"
        class="flex items-end gap-2">
        <div class="flex-1">
          <InputText
            v-model="formData.securityMeasures[index]"
            fluid
            placeholder="Security measure" />
        </div>
        <Button
          v-if="formData.securityMeasures.length > 1"
          icon="pi pi-trash"
          severity="danger"
          text
          @click="removeArrayItem('securityMeasures', index)" />
      </div>
      <Button
        label="Add Security Measure"
        icon="pi pi-plus"
        severity="secondary"
        text
        @click="addArrayItem('securityMeasures')" />

      <Divider />
      <h3 class="text-xl font-semibold">Compliance Requirements</h3>
      <div
        v-for="(requirement, index) in formData.complianceRequirements"
        :key="index"
        class="flex items-end gap-2">
        <div class="flex-1">
          <InputText
            v-model="formData.complianceRequirements[index]"
            fluid
            placeholder="Compliance requirement" />
        </div>
        <Button
          v-if="formData.complianceRequirements.length > 1"
          icon="pi pi-trash"
          severity="danger"
          text
          @click="removeArrayItem('complianceRequirements', index)" />
      </div>
      <Button
        label="Add Compliance Requirement"
        icon="pi pi-plus"
        severity="secondary"
        text
        @click="addArrayItem('complianceRequirements')" />

      <Divider />
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" @click="$emit('cancel')" />
        <Button
          label="Create Project Agreement"
          icon="pi pi-check"
          type="submit"
          :loading="loading" />
      </div>
    </form>
  </div>
</template>
