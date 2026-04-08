<script setup lang="ts">
import {
  AlgorithmDefinitionDto,
  CreateAlgorithmInstanceDto,
  ProjectAgreementDetailDto,
  UIElementType
} from "@tsg-dsp/analytics-data-plane-dtos";
import { AlgorithmParticipant } from "@tsg-dsp/analytics-data-plane-dtos";
import MonacoEditorVue from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import { formatRelative } from "@tsg-dsp/common-ui/utils/date";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { ProgressSpinner } from "primevue";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import schema from "../assets/algorithm-definition.schema.json";
import { ProjectAgreementsService } from "../services/ProjectAgreementsService";
import { useAlgorithmInstancesStore } from "../stores/algorithm-instances";
import { RegistryParticipant, useRegistryStore } from "../stores/registry";
import { useRuntimeStore } from "../stores/runtime";

const router = useRouter();
const registryStore = useRegistryStore();
const algorithmStore = useAlgorithmInstancesStore();
const runtimeStore = useRuntimeStore();

const algorithmId = crypto.randomUUID();
const refreshingRegistry = ref(false);

let participantId = "";
const participantOptions = computed(() => {
  let availableParticipants = registryStore.participants;

  // If a project agreement is selected, filter to only participants in that agreement
  if (selectedProjectAgreement.value) {
    const projectParticipantIds =
      selectedProjectAgreement.value.projectAgreement.participants.map(
        (p) => p.didId
      );
    availableParticipants = availableParticipants.filter((participant) =>
      projectParticipantIds.includes(participant.didId)
    );
  }

  const options = availableParticipants
    .map((participant: RegistryParticipant) => ({
      label: participant.didId,
      value: participant.didId
    }))
    .filter((option) => option.value !== participantId);

  return [
    {
      label: `${participantId} (You)`,
      value: participantId
    },
    ...options
  ];
});

const datasetOptions = ref<
  Record<string, { label: string; value: string; disabled?: boolean }[]>
>({});

/* ----------------------------
   1. Algorithm Definition step
   ---------------------------- */
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const toast = useToast();
const sample: AlgorithmDefinitionDto = {
  title: "Sample algorithm",
  description: "This is a sample algorithm",
  keywords: ["sample", "algorithm"],
  image:
    "registry.gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/adp-test-image:latest",
  roleDefinitions: [
    {
      name: "aggregator",
      states: [
        {
          name: "idle"
        },
        {
          name: "running"
        },
        {
          name: "completed"
        }
      ],
      cardinality: {
        min: 1,
        max: 1
      },
      communicatesToRoles: ["participant"]
    },
    {
      name: "participant",
      states: [
        {
          name: "idle"
        },
        {
          name: "running"
        },
        {
          name: "completed"
        }
      ],
      cardinality: {
        min: 1
      },
      communicatesToRoles: ["aggregator"]
    }
  ],
  algorithmEvents: [
    {
      name: "participant_result",
      description: "Result of the participant",
      type: "blob"
    },
    {
      name: "aggregation_result",
      description: "Result of the aggregation",
      type: "blob"
    }
  ],
  internalEvents: [
    {
      name: "iterations",
      description: "Number of iterations executed",
      type: "counter"
    }
  ],
  uiTemplate: [
    {
      metric: "iterations",
      description: "Number of iterations",
      type: UIElementType.FIELD
    }
  ]
};
const rawAlgorithmDefinition = ref<string>("{}");
const algorithmDefinition = defineModel<AlgorithmDefinitionDto>();

const useSampleDefinition = () => {
  rawAlgorithmDefinition.value = JSON.stringify(sample, null, 2);
  algorithmDefinition.value = sample;
};

const validateAlgortithmDefinition = (
  activateCallback: (value: string | number) => void
) => {
  try {
    algorithmDefinition.value = JSON.parse(rawAlgorithmDefinition.value);
  } catch (_error) {
    toast.add({
      severity: "error",
      summary: "Invalid JSON",
      detail: "Please provide a valid JSON object",
      life: 3000
    });
    return;
  }
  const valid = validate(algorithmDefinition.value);
  if (valid) {
    activateCallback("2");
  } else {
    const errorMessages = validate.errors.map((error) => {
      const path = error.instancePath || "root";
      return `${path}: ${error.message}${error.params ? " (" + JSON.stringify(error.params) + ")" : ""}`;
    });
    toast.add({
      severity: "error",
      summary: "Invalid Algorithm Definition",
      detail:
        "Please fix the following errors:\n- " + errorMessages.join("\n- "),
      life: 3000
    });
  }
};

/* --------------------------
   2. Project Agreement step
   -------------------------- */
const projectAgreements = ref<ProjectAgreementDetailDto[]>([]);
const selectedProjectAgreement = ref<ProjectAgreementDetailDto | null>(null);
const projectAgreementsLoading = ref(false);

const loadProjectAgreements = async () => {
  projectAgreementsLoading.value = true;
  try {
    projectAgreements.value = await ProjectAgreementsService.getFinalized();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading project agreements failed",
        defaultMessage: "Could not load finalized project agreements"
      })
    );
  } finally {
    projectAgreementsLoading.value = false;
  }
};

const isProjectAgreementRequired = computed(
  () => runtimeStore.requireProjectAgreement
);

const validateProjectAgreement = (
  activateCallback: (value: string | number) => void
) => {
  if (isProjectAgreementRequired.value && !selectedProjectAgreement.value) {
    toast.add({
      severity: "error",
      summary: "Project Agreement Required",
      detail:
        "A project agreement is required to create an algorithm instance. Please select a finalized project agreement.",
      life: 5000
    });
    return;
  }

  // Reset participants when project agreement changes and add participants based on project agreement
  participants.value = [];
  if (selectedProjectAgreement.value && algorithmDefinition.value) {
    algorithmDefinition.value.roleDefinitions.forEach((role) => {
      if (role.cardinality.min > 0) {
        Array.from({ length: role.cardinality.min }).forEach(() => {
          addParticipant("", role.name, "");
        });
      }
    });
  } else if (algorithmDefinition.value) {
    // Add default participants if no project agreement selected
    algorithmDefinition.value.roleDefinitions.forEach((role) => {
      if (role.cardinality.min > 0) {
        Array.from({ length: role.cardinality.min }).forEach(() => {
          addParticipant("", role.name, "");
        });
      }
    });
  }

  activateCallback("3");
};

/* --------------------
   3. Participants step
   -------------------- */
const participants = ref<AlgorithmParticipant[]>([]);

const getParticipantCatalog = async (didId: string) => {
  try {
    const catalog = await registryStore.fetchParticipantCatalog(didId);
    if (!catalog.dataset || catalog.dataset.length === 0) {
      datasetOptions.value[didId] = [
        {
          label: "No datasets found",
          value: "",
          disabled: true
        }
      ];
      toast.add({
        severity: "warn",
        summary: "No datasets found",
        detail: `No datasets found for participant ${didId}`,
        life: 3000
      });
      return;
    }
    datasetOptions.value[didId] = catalog.dataset?.map((dataset) => ({
      label: dataset.title
        ? `${dataset.title} (${dataset["@id"]})`
        : dataset["@id"],
      value: dataset["@id"]
    }));
    return catalog;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading catalog failed",
        defaultMessage: `Could not load catalog for participant ${didId}`
      })
    );
    return [];
  }
};

// Auto-fetch datasets when a participant DID changes
const onDidIdChange = async (index: number, didId: string) => {
  // Reset selected dataset for the row when DID changes
  if (participants.value[index]) {
    participants.value[index].dataset = "";
  }
  // Guard against empty DID values
  if (!didId) return;
  // Fetch datasets for the selected participant
  await getParticipantCatalog(didId);
};

const addParticipant = (
  didId: string = "",
  role: string = "",
  dataset: string = ""
) => {
  const newParticipant = new AlgorithmParticipant();
  newParticipant.didId = didId;
  newParticipant.role = role;
  newParticipant.dataset = dataset;
  participants.value.push(newParticipant);
};

const removeParticipant = (index: number) => {
  participants.value.splice(index, 1);
};

const validateParticipants = (
  activateCallback: (value: string | number) => void
) => {
  if (participants.value.length === 0) {
    toast.add({
      severity: "error",
      summary: "No Participants",
      detail: "Please add at least one participant",
      life: 3000
    });
    return;
  }

  const invalidParticipants = participants.value.filter(
    (p) => !p.didId || !p.role || !p.dataset
  );

  if (invalidParticipants.length > 0) {
    toast.add({
      severity: "error",
      summary: "Incomplete Participants",
      detail: `Please fill in all fields for all participants`,
      life: 3000
    });
    return;
  }

  const availableRoles =
    algorithmDefinition.value?.roleDefinitions?.map((r) => r.name) || [];
  const invalidRoles = participants.value.filter(
    (p) => !availableRoles.includes(p.role)
  );

  if (invalidRoles.length > 0) {
    toast.add({
      severity: "error",
      summary: "Invalid Roles",
      detail: `Some participants have roles that don't match the algorithm definition`,
      life: 3000
    });
    return;
  }

  summary.value = JSON.stringify(generateInstanceDto(), null, 2);
  activateCallback("4");
};

/* ---------------
   4. Summary step
   --------------- */
const summary = ref("");
const isSubmitting = ref(false);

const generateInstanceDto = (): CreateAlgorithmInstanceDto => {
  const instanceDto: CreateAlgorithmInstanceDto = {
    id: algorithmId,
    algorithmDefinition: algorithmDefinition.value,
    participants: [...participants.value],
    projectAgreementId: selectedProjectAgreement.value?.id
  };
  return instanceDto;
};

const submitAlgorithmInstance = async () => {
  const createInstanceDto = generateInstanceDto();
  try {
    isSubmitting.value = true;
    const created =
      await algorithmStore.createAlgorithmInstance(createInstanceDto);
    toast.add({
      severity: "success",
      summary: "Instance Created",
      detail: `Algorithm instance created with ID: ${created.id}`,
      life: 5000
    });
    router.push("/algorithms/instances");
  } catch (error) {
    toast.add(
      toastError({
        error,
        severity: "error",
        summary: "Submission Failed",
        defaultMessage: "Failed to create the algorithm instance"
      })
    );
  } finally {
    isSubmitting.value = false;
  }
};

const getParticipantId = async () => {
  try {
    const response = await http.get(`/management/participant-id`);
    participantId = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not fetch DID ID",
        defaultMessage: "Failed to fetch DID ID"
      })
    );
  }
};

const refreshRegistry = async () => {
  refreshingRegistry.value = true;
  try {
    await registryStore.refreshRegistry();

    const participantDids = participants.value
      .map((p) => p.didId)
      .filter((didId) => didId && didId.trim() !== "");

    await Promise.all(
      participantDids.map((didId) => getParticipantCatalog(didId))
    );

    toast.add({
      severity: "success",
      summary: "Registry Refreshed",
      detail: "The registry has been refreshed successfully",
      life: 3000
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to refresh registry",
        defaultMessage: "Could not refresh the registry"
      })
    );
  } finally {
    refreshingRegistry.value = false;
  }
};

onMounted(async () => {
  await Promise.allSettled([
    getParticipantId(),
    registryStore.initialize(),
    loadProjectAgreements()
  ]);
});
</script>
<template>
  <Card class="mt-8">
    <template #content>
      <Stepper value="1" linear>
        <StepList>
          <Step value="1">Algorithm Definition</Step>
          <Step value="2">Project Agreement</Step>
          <Step value="3">Participants</Step>
          <Step value="4">Summary</Step>
        </StepList>
        <StepPanels>
          <StepPanel v-slot="{ active, activateCallback }" value="1">
            <template v-if="active">
              <MonacoEditorVue
                v-model="rawAlgorithmDefinition"
                :schema="schema"
                schema-warning
                language="json"
                height="450px" />
              <div class="text-right mt-2">
                <Button
                  icon="pi pi-code"
                  icon-pos="right"
                  severity="help"
                  label="Use Sample Definition"
                  class="mb-2"
                  @click="useSampleDefinition()" />
              </div>
              <div class="flex pt-6 justify-end">
                <Button
                  icon="pi pi-arrow-right"
                  icon-pos="right"
                  label="Next"
                  class="mb-2 w-full"
                  @click="validateAlgortithmDefinition(activateCallback)" />
              </div>
            </template>
          </StepPanel>
          <StepPanel v-slot="{ active, activateCallback }" value="2">
            <template v-if="active">
              <p class="mb-4">
                <template v-if="isProjectAgreementRequired">
                  Select a finalized project agreement to link to this algorithm
                  instance. A project agreement is
                  <strong>required</strong> for this data plane.
                </template>
                <template v-else>
                  Optionally select a finalized project agreement to link to
                  this algorithm instance. You can skip this step if you don't
                  want to link a project agreement.
                </template>
              </p>
              <div v-if="projectAgreementsLoading" class="flex justify-center">
                <ProgressSpinner style="width: 50px; height: 50px" />
              </div>
              <div
                v-else-if="projectAgreements.length === 0"
                class="p-4 text-center text-gray-500 border border-dashed rounded-md">
                <p>No finalized project agreements found.</p>
                <p v-if="isProjectAgreementRequired" class="mt-2 text-red-500">
                  A project agreement is required. Please create and finalize a
                  project agreement first.
                </p>
              </div>
              <div v-else>
                <DataTable
                  v-model:selection="selectedProjectAgreement"
                  :value="projectAgreements"
                  selection-mode="single"
                  data-key="id"
                  :rows="5"
                  :rows-per-page-options="[5, 10, 20]"
                  paginator
                  responsive-layout="scroll">
                  <Column selection-mode="single" header-style="width: 3rem" />
                  <Column
                    field="projectAgreement.title"
                    header="Title"
                    :sortable="true" />
                  <Column
                    field="projectAgreement.description"
                    header="Description"
                    :sortable="false">
                    <template #body="slotProps">
                      <span class="text-sm truncate max-w-xs">{{
                        slotProps.data.projectAgreement.description
                      }}</span>
                    </template>
                  </Column>
                  <Column field="initiator" header="Initiator" :sortable="true">
                    <template #body="slotProps">
                      <span class="text-sm font-mono">{{
                        slotProps.data.initiator || "N/A"
                      }}</span>
                    </template>
                  </Column>
                  <Column
                    field="projectAgreement.validUntil"
                    header="Valid Until"
                    :sortable="true">
                    <template #body="slotProps">
                      {{
                        formatRelative(
                          slotProps.data.projectAgreement.validUntil
                        )
                      }}
                    </template>
                  </Column>
                </DataTable>
                <div
                  v-if="selectedProjectAgreement"
                  class="mt-4 p-3 bg-surface-50 dark:bg-surface-800 rounded border border-surface-200 dark:border-surface-700">
                  <h4 class="font-semibold mb-2">Selected Project Agreement</h4>
                  <p>
                    <strong>Title:</strong>
                    {{ selectedProjectAgreement.projectAgreement.title }}
                  </p>
                  <p>
                    <strong>Purpose:</strong>
                    {{ selectedProjectAgreement.projectAgreement.purpose }}
                  </p>
                  <p>
                    <strong>Participants:</strong>
                    {{
                      selectedProjectAgreement.projectAgreement.participants
                        .map((p) => p.title || p.didId)
                        .join(", ")
                    }}
                  </p>
                </div>
              </div>
              <div class="flex pt-6 gap-4">
                <Button
                  icon="pi pi-arrow-left"
                  icon-pos="left"
                  label="Back"
                  class="mb-2 w-full"
                  @click="activateCallback('1')" />
                <Button
                  icon="pi pi-arrow-right"
                  icon-pos="right"
                  :label="
                    isProjectAgreementRequired || selectedProjectAgreement
                      ? 'Next'
                      : 'Skip'
                  "
                  class="mb-2 w-full"
                  @click="validateProjectAgreement(activateCallback)" />
              </div>
            </template>
          </StepPanel>
          <StepPanel v-slot="{ activateCallback }" value="3">
            <div class="flex justify-between items-center mb-4">
              <p class="mb-0">
                Add participants to the algorithm instance below.
                <template v-if="selectedProjectAgreement">
                  Only participants from the selected project agreement are
                  available.
                </template>
                <template v-else>
                  All registered participants are available for selection.
                </template>
              </p>
              <Button
                icon="pi pi-refresh"
                label="Refresh Registry"
                :loading="refreshingRegistry"
                severity="secondary"
                size="small"
                @click="refreshRegistry" />
            </div>
            <div class="mt-4">
              <div
                v-for="(participant, index) in participants"
                :key="index"
                class="flex gap-3 mb-3 items-center">
                <div class="flex-1">
                  <Select
                    v-model="participant.didId"
                    :options="participantOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="Select DID ID"
                    class="w-full"
                    editable
                    @change="(e) => onDidIdChange(index, e.value)" />
                </div>
                <div class="flex-1">
                  <Select
                    v-model="participant.role"
                    :options="
                      algorithmDefinition?.roleDefinitions?.map(
                        (role) => role.name
                      ) || []
                    "
                    placeholder="Select Role"
                    class="w-full" />
                </div>
                <div class="flex-1 flex">
                  <Select
                    v-model="participant.dataset"
                    :options="
                      datasetOptions[participant.didId] || [
                        {
                          label:
                            'No datasets available, click on the refresh icon to load datasets for this participant',
                          value: '',
                          disabled: true
                        }
                      ]
                    "
                    option-disabled="disabled"
                    option-label="label"
                    option-value="value"
                    editable
                    placeholder="Dataset"
                    class="w-full" />
                  <Button
                    icon="pi pi-refresh"
                    severity="secondary"
                    outlined
                    class="ml-2"
                    @click="getParticipantCatalog(participant.didId)" />
                </div>
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  :disabled="index === 0"
                  text
                  @click="removeParticipant(index)" />
              </div>
              <div
                v-if="participants.length === 0"
                class="p-4 text-center text-gray-500 border border-dashed rounded-md">
                No participants added yet. Use the button below to add your
                first participant.
              </div>
              <div class="mt-3">
                <Button
                  icon="pi pi-plus"
                  label="Add Participant"
                  outlined
                  @click="addParticipant()" />
              </div>
            </div>
            <div class="flex pt-6 gap-4">
              <Button
                icon="pi pi-arrow-left"
                icon-pos="left"
                label="Back"
                class="mb-2 w-full"
                @click="activateCallback('2')" />
              <Button
                icon="pi pi-arrow-right"
                icon-pos="right"
                label="Next"
                class="mb-2 w-full"
                @click="validateParticipants(activateCallback)" />
            </div>
          </StepPanel>
          <StepPanel v-slot="{ active, activateCallback }" value="4">
            <template v-if="active">
              <p class="mb-4">
                Verify the algorithm instance below. The <i>id</i> and
                <i>createdDate</i> fields contain placeholder data in this
                summary and will be properly filled in by the Analytics Data
                Plance once submitted. Press Submit to deploy the instance.
              </p>
              <MonacoEditorVue
                v-model="summary"
                :read-only="true"
                language="json"
                height="450px" />
              <div class="flex pt-6 gap-4">
                <Button
                  icon="pi pi-arrow-left"
                  icon-pos="left"
                  label="Back"
                  class="mb-2 w-full"
                  @click="activateCallback('3')" />
                <Button
                  icon="pi pi-send"
                  icon-pos="right"
                  label="Submit"
                  class="mb-2 w-full"
                  :loading="isSubmitting"
                  @click="submitAlgorithmInstance" />
              </div>
            </template>
          </StepPanel>
        </StepPanels>
      </Stepper>
    </template>
  </Card>
</template>
