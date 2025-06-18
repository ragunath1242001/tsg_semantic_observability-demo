<script setup lang="ts">
import {
  AlgorithmDefinitionDto,
  AlgorithmInstanceDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { AlgorithmParticipant } from "@tsg-dsp/analytics-data-plane-dtos";
import { DataPlaneStateDto } from "@tsg-dsp/common-dtos";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import schema from "../assets/algorithm-definition.schema.json";

const router = useRouter();

/* ----------------------------
   1. Algorithm Definition step
   ---------------------------- */
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const toast = useToast();
const rawAlgorithmDefinition = ref<string>();
const algorithmDefinition = defineModel<AlgorithmDefinitionDto>();

const validateAlgortithmDefinition = (activateCallback) => {
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

/* --------------------
   2. Participants step
   -------------------- */
const participants = ref<AlgorithmParticipant[]>([]);
const dataPlaneState = ref<DataPlaneStateDto>();

const getDataPlaneState = async () => {
  try {
    const response = await http.get<DataPlaneStateDto>("management/state");
    dataPlaneState.value = response.data;
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

const getDatasetIds = () => {
  if (!dataPlaneState.value?.dataset) return [];

  if (Array.isArray(dataPlaneState.value.dataset)) {
    return dataPlaneState.value.dataset
      .filter((item) => item && "@id" in item)
      .map((item) => item["@id"]);
  }
  return [];
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

const validateParticipants = (activateCallback) => {
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

  summary.value = generateInstanceDto();
  activateCallback("3");
};

/* ---------------
   3. Summary step
   --------------- */
const summary = ref("");
const isSubmitting = ref(false);

const generateInstanceDto = () => {
  const instanceDto = new AlgorithmInstanceDto();
  instanceDto.id = "...";
  instanceDto.createdDate = new Date();
  instanceDto.algorithmDefinition = algorithmDefinition.value;
  instanceDto.participants = [...participants.value];
  return JSON.stringify(instanceDto, null, 2);
};

const submitAlgorithmInstance = async () => {
  const instanceDto = generateInstanceDto();
  try {
    isSubmitting.value = true;
    const response = await http.post("algorithm-instances", instanceDto);
    toast.add({
      severity: "success",
      summary: "Instance Created",
      detail: `Algorithm instance created with ID: ${response.data.id}`,
      life: 5000
    });
    router.push("/algorithm-instance");
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

onMounted(async () => {
  try {
    await getDataPlaneState();
    const response = await http.get(`/participant-id`);
    addParticipant(response.data, "", "");
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not fetch DID ID",
        defaultMessage: "Failed to fetch DID ID for the first participant"
      })
    );
  }
});
</script>
<template>
  <Card class="mt-8">
    <template #content>
      <Stepper value="1" linear>
        <StepList>
          <Step value="1">Algorithm Definition</Step>
          <Step value="2">Participants</Step>
          <Step value="3">Summary</Step>
        </StepList>
        <StepPanels>
          <StepPanel v-slot="{ activateCallback }" value="1">
            <MonacoEditorVue
              v-model="rawAlgorithmDefinition"
              :schema="schema"
              schema-warning
              language="json"
              height="450px" />
            <div class="flex pt-6 justify-end">
              <Button
                icon="pi pi-arrow-right"
                icon-pos="right"
                label="Next"
                class="mb-2 w-full"
                @click="validateAlgortithmDefinition(activateCallback)" />
            </div>
          </StepPanel>
          <StepPanel v-slot="{ activateCallback }" value="2">
            <p class="mb-4">
              Add participants to the algorithm instance below. The first
              participant in the list is the initiator of the algorithm instance
              and is always required.
            </p>
            <div class="mt-4">
              <div
                v-for="(participant, index) in participants"
                :key="index"
                class="flex gap-3 mb-3 items-center">
                <div class="flex-1">
                  <InputText
                    v-model="participant.didId"
                    placeholder="DID ID"
                    :disabled="index === 0"
                    class="w-full" />
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
                <div class="flex-1">
                  <Select
                    v-model="participant.dataset"
                    :options="index === 0 ? getDatasetIds() : []"
                    editable
                    placeholder="Dataset"
                    class="w-full" />
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
                @click="activateCallback('1')" />
              <Button
                icon="pi pi-arrow-right"
                icon-pos="right"
                label="Next"
                class="mb-2 w-full"
                @click="validateParticipants(activateCallback)" />
            </div>
          </StepPanel>
          <StepPanel v-slot="{ activateCallback }" value="3">
            <p class="mb-4">
              Verify the algorithm instance below. The <i>id</i> and
              <i>createdDate</i> fields contain placeholder data in this summary
              and will be properly filled in by the Analytics Data Plance once
              submitted. Press Submit to deploy the instance.
            </p>
            <MonacoEditorVue
              v-model="summary"
              read-only="true"
              language="json"
              height="450px" />
            <div class="flex pt-6 gap-4">
              <Button
                icon="pi pi-arrow-left"
                icon-pos="left"
                label="Back"
                class="mb-2 w-full"
                @click="activateCallback('2')" />
              <Button
                icon="pi pi-send"
                icon-pos="right"
                label="Submit"
                class="mb-2 w-full"
                :loading="isSubmitting"
                @click="submitAlgorithmInstance" />
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>
    </template>
  </Card>
</template>
