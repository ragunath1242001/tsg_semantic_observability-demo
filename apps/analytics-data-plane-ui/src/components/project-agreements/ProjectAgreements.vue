<script setup lang="ts">
import { ProjectAgreementDetailDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { formatDate, formatRelative } from "@tsg-dsp/common-ui/utils/date.js";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { useConfirm } from "primevue";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

import { ProjectAgreementsService } from "../../services/ProjectAgreementsService";
import { useCatalogStore } from "../../stores/catalog";

const toast = useToast();
const confirm = useConfirm();

const agreements = ref<ProjectAgreementDetailDto[]>([]);
const loading = ref(false);
const signing = ref(false);
const selectedAgreement = ref<ProjectAgreementDetailDto | null>(null);
const viewDialogVisible = ref(false);
const signDialogVisible = ref(false);

const catalog = useCatalogStore();
const selectedDatasetToLink = ref<string | null>(null);

const datasetOptions = computed(() => {
  return catalog.catalog.dataset
    .filter(
      (ds) => !selectedAgreement.value.datasets.some((d) => d.id === ds["@id"])
    )
    .map((ds) => ({
      label: ds.title || ds["@id"],
      value: ds["@id"]
    }));
});

const loadAgreements = async () => {
  loading.value = true;
  try {
    agreements.value = await ProjectAgreementsService.getAll();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading project agreements failed",
        defaultMessage: `Could not load project agreements`
      })
    );
  } finally {
    loading.value = false;
  }
};

const onRowSelect = (event: { data: ProjectAgreementDetailDto }) => {
  viewAgreement(event.data);
};

const viewAgreement = (agreement: ProjectAgreementDetailDto) => {
  selectedAgreement.value = agreement;
  viewDialogVisible.value = true;
};

const signAgreement = (agreement: ProjectAgreementDetailDto) => {
  selectedAgreement.value = agreement;
  signDialogVisible.value = true;
};

const canSign = (
  agreement: ProjectAgreementDetailDto | null | undefined
): boolean => {
  if (!agreement) return false;
  return agreement.status === "SIGNATURE_REQUESTED" || !agreement.status;
};

const getStatusSeverity = (
  status:
    | "WAITING_FOR_SIGNATURES"
    | "SIGNATURE_REQUESTED"
    | "SIGNED"
    | "FINALIZED"
    | undefined
): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" => {
  if (
    !status ||
    status === "WAITING_FOR_SIGNATURES" ||
    status === "SIGNATURE_REQUESTED"
  )
    return "warning";
  if (status === "FINALIZED") return "success";
  if (status === "SIGNED") return "info";
  return "secondary";
};

const handleSign = () => {
  signDialogVisible.value = true;
  viewDialogVisible.value = false;
};

const linkDataset = async (datasetId: string) => {
  if (!selectedAgreement.value) return;

  try {
    await ProjectAgreementsService.linkDataset(
      selectedAgreement.value.id,
      datasetId
    );
    const dataset = {
      id: datasetId,
      title:
        catalog.catalog.dataset.find((ds) => ds["@id"] === datasetId)?.title ||
        datasetId
    };
    selectedAgreement.value.datasets.push(dataset);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Dataset linked to project agreement successfully",
      life: 3000
    });
    await loadAgreements();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Linking dataset failed",
        defaultMessage: `Could not link dataset to project agreement`
      })
    );
  }
};

const confirmUnlink = async (agreementId: number, datasetId: string) => {
  confirm.require({
    message: `Are you sure you want to unlink the dataset from this project agreement?`,
    header: "Confirm Unlink Dataset",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Yes, Unlink",
    rejectLabel: "Cancel",
    accept: async () => {
      try {
        await ProjectAgreementsService.unlinkDataset(agreementId, datasetId);
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Dataset unlinked from project agreement successfully",
          life: 3000
        });
        if (selectedAgreement.value) {
          selectedAgreement.value.datasets =
            selectedAgreement.value.datasets.filter(
              (ds) => ds.id !== datasetId
            );
        }
        await loadAgreements();
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: "Unlinking dataset failed",
            defaultMessage: `Could not unlink dataset from project agreement`
          })
        );
      }
    }
  });
};

const confirmSign = async () => {
  if (!selectedAgreement.value) return;

  signing.value = true;
  try {
    await ProjectAgreementsService.sign(selectedAgreement.value.id);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Project agreement signed successfully",
      life: 3000
    });
    signDialogVisible.value = false;
    await loadAgreements();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Signing project agreement failed",
        defaultMessage: `Could not sign project agreement`
      })
    );
  } finally {
    signing.value = false;
  }
};

onMounted(() => {
  loadAgreements();
  catalog.getOwnCatalog();
});

defineExpose({
  loadAgreements
});
</script>

<template>
  <div class="project-agreements">
    <DataTable
      v-model:selection="selectedAgreement"
      :value="agreements"
      :loading="loading"
      :rows="10"
      :rows-per-page-options="[5, 10, 20]"
      paginator
      responsive-layout="scroll"
      selection-mode="single"
      @row-select="onRowSelect">
      <template #empty> No project agreements found. </template>
      <Column field="projectAgreement.id" header="ID" :sortable="true">
        <template #body="slotProps">
          <span class="text-xs font-mono">{{
            slotProps.data.projectAgreement.id
          }}</span>
        </template>
      </Column>
      <Column field="projectAgreement.title" header="Title" :sortable="true" />
      <Column field="initiator" header="Initiator" :sortable="true">
        <template #body="slotProps">
          <span class="text-sm font-mono">{{
            slotProps.data.initiator || "N/A"
          }}</span>
        </template>
      </Column>
      <Column field="status" header="Status" :sortable="true">
        <template #body="slotProps">
          <Tag
            :value="slotProps.data.status || 'pending'"
            :severity="getStatusSeverity(slotProps.data.status)" />
        </template>
      </Column>
      <Column
        field="projectAgreement.validFrom"
        header="Valid From"
        :sortable="true">
        <template #body="slotProps">
          {{ formatRelative(slotProps.data.projectAgreement.validFrom) }}
        </template>
      </Column>
      <Column
        field="projectAgreement.validUntil"
        header="Valid Until"
        :sortable="true">
        <template #body="slotProps">
          {{ formatRelative(slotProps.data.projectAgreement.validUntil) }}
        </template>
      </Column>
      <Column field="datasets" header="Datasets" :sortable="false">
        <template #body="slotProps">
          <div class="flex flex-wrap gap-2">
            <Chip
              v-for="(dataset, index) in slotProps.data.datasets"
              :key="index"
              :label="dataset.title" />
          </div>
        </template>
      </Column>
      <Column header="Actions">
        <template #body="slotProps">
          <div class="flex gap-2">
            <Button
              v-tooltip.top="'View Details'"
              icon="pi pi-eye"
              severity="info"
              text
              rounded
              @click="viewAgreement(slotProps.data)" />
            <Button
              v-if="canSign(slotProps.data)"
              v-tooltip.top="'Sign Agreement'"
              icon="pi pi-check"
              severity="success"
              text
              rounded
              @click="signAgreement(slotProps.data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="viewDialogVisible"
      :header="selectedAgreement?.projectAgreement?.title"
      :modal="true"
      :style="{ width: '800px' }"
      :maximizable="true"
      :dismissable-mask="true">
      <div v-if="selectedAgreement" class="agreement-details">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <strong>Project ID:</strong>
            <p>{{ selectedAgreement.projectAgreement.id }}</p>
          </div>
          <div>
            <strong>Status:</strong>
            <p>
              <Tag
                :value="selectedAgreement.status || 'pending'"
                :severity="getStatusSeverity(selectedAgreement.status)" />
            </p>
          </div>
          <div class="col-span-2">
            <strong>Description:</strong>
            <p>{{ selectedAgreement.projectAgreement.description }}</p>
          </div>
          <div>
            <strong>Valid From:</strong>
            <p>
              {{ formatDate(selectedAgreement.projectAgreement.validFrom) }}
            </p>
          </div>
          <div>
            <strong>Valid Until:</strong>
            <p>
              {{ formatDate(selectedAgreement.projectAgreement.validUntil) }}
            </p>
          </div>
          <div class="col-span-2">
            <strong>Purpose:</strong>
            <p>{{ selectedAgreement.projectAgreement.purpose }}</p>
          </div>
          <div class="col-span-2">
            <strong>Research Question:</strong>
            <p>{{ selectedAgreement.projectAgreement.researchQuestion }}</p>
          </div>
        </div>
        <Divider />

        <h3>Linked Datasets</h3>
        <div
          v-for="(dataset, index) in selectedAgreement.datasets"
          :key="index"
          class="mb-3 p-3 bg-surface-50 dark:bg-surface-800 rounded border border-surface-200 dark:border-surface-700">
          <div class="grid grid-cols-6 gap-4">
            <div class="col-span-3">
              <strong>Title:</strong>
              <p>{{ dataset.title }}</p>
            </div>
            <div class="col-span-2">
              <strong>Identifier:</strong>
              <p class="text-sm">{{ dataset.id }}</p>
            </div>
            <div class="col-span-1">
              <Button
                label="Unlink"
                icon="pi pi-times"
                severity="danger"
                size="small"
                text
                @click="confirmUnlink(selectedAgreement.id, dataset.id)" />
            </div>
          </div>
        </div>

        <h4>Link dataset</h4>
        <div class="flex items-center gap-2 mb-4">
          <Select
            v-model="selectedDatasetToLink"
            :options="datasetOptions"
            option-label="label"
            option-value="value"
            placeholder="Select Dataset to Link"
            class="w-full" />
          <Button
            label="Link Dataset"
            icon="pi pi-link"
            :disabled="!selectedDatasetToLink"
            @click="linkDataset(selectedDatasetToLink)" />
        </div>

        <Divider />

        <h3>Participants</h3>
        <div
          v-for="(participant, index) in selectedAgreement.projectAgreement
            .participants"
          :key="index"
          class="mb-3 p-3 bg-surface-50 dark:bg-surface-800 rounded border border-surface-200 dark:border-surface-700">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <strong>Title:</strong>
              <p>{{ participant.title }}</p>
            </div>
            <div>
              <strong>DID:</strong>
              <p class="text-sm">{{ participant.didId }}</p>
            </div>
          </div>
        </div>

        <Divider />

        <Accordion :value="[]" multiple>
          <AccordionPanel
            value="0"
            :disabled="
              selectedAgreement.projectAgreement.objectives.length === 0
            ">
            <AccordionHeader>
              <span class="flex items-center justify-between mr-4 gap-2 w-full">
                <span>Objectives</span>
                <Badge
                  :value="
                    selectedAgreement.projectAgreement.objectives.length
                  " />
              </span>
            </AccordionHeader>
            <AccordionContent>
              <ul class="flex flex-col gap-2">
                <li
                  v-for="(objective, index) in selectedAgreement
                    .projectAgreement.objectives"
                  :key="index">
                  {{ objective }}
                </li>
              </ul>
            </AccordionContent>
          </AccordionPanel>

          <AccordionPanel
            value="1"
            :disabled="
              selectedAgreement.projectAgreement.hypotheses.length === 0
            ">
            <AccordionHeader>
              <span class="flex items-center justify-between mr-4 gap-2 w-full">
                <span>Hypotheses</span>
                <Badge
                  :value="
                    selectedAgreement.projectAgreement.hypotheses.length
                  " />
              </span>
            </AccordionHeader>
            <AccordionContent>
              <ul class="flex flex-col gap-2">
                <li
                  v-for="(hypothesis, index) in selectedAgreement
                    .projectAgreement.hypotheses"
                  :key="index">
                  {{ hypothesis }}
                </li>
              </ul>
            </AccordionContent>
          </AccordionPanel>

          <AccordionPanel
            value="2"
            :disabled="
              selectedAgreement.projectAgreement.dataUseConditions.length === 0
            ">
            <AccordionHeader>
              <span class="flex items-center justify-between mr-4 gap-2 w-full">
                <span>Data Use Conditions</span>
                <Badge
                  :value="
                    selectedAgreement.projectAgreement.dataUseConditions.length
                  " />
              </span>
            </AccordionHeader>
            <AccordionContent>
              <ul class="flex flex-col gap-2">
                <li
                  v-for="(condition, index) in selectedAgreement
                    .projectAgreement.dataUseConditions"
                  :key="index">
                  {{ condition }}
                </li>
              </ul>
            </AccordionContent>
          </AccordionPanel>

          <AccordionPanel
            value="3"
            :disabled="
              selectedAgreement.projectAgreement.securityMeasures.length === 0
            ">
            <AccordionHeader>
              <span class="flex items-center justify-between mr-4 gap-2 w-full">
                <span>Security Measures</span>
                <Badge
                  :value="
                    selectedAgreement.projectAgreement.securityMeasures.length
                  " />
              </span>
            </AccordionHeader>
            <AccordionContent>
              <ul class="flex flex-col gap-2">
                <li
                  v-for="(measure, index) in selectedAgreement.projectAgreement
                    .securityMeasures"
                  :key="index">
                  {{ measure }}
                </li>
              </ul>
            </AccordionContent>
          </AccordionPanel>

          <AccordionPanel
            value="4"
            :disabled="
              selectedAgreement.projectAgreement.complianceRequirements
                .length === 0
            ">
            <AccordionHeader>
              <span class="flex items-center justify-between mr-4 gap-2 w-full">
                <span>Compliance Requirements</span>
                <Badge
                  :value="
                    selectedAgreement.projectAgreement.complianceRequirements
                      .length
                  " />
              </span>
            </AccordionHeader>
            <AccordionContent>
              <ul class="flex flex-col gap-2">
                <li
                  v-for="(requirement, index) in selectedAgreement
                    .projectAgreement.complianceRequirements"
                  :key="index">
                  {{ requirement }}
                </li>
              </ul>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>

        <div
          v-if="Object.keys(selectedAgreement.signatures).length > 0"
          class="mt-4">
          <Divider />
          <h3>Signatures</h3>
          <div
            v-for="(signature, participantId) in selectedAgreement.signatures"
            :key="participantId"
            class="mb-2">
            <h4 class="font-semibold text-lg!">{{ participantId }}</h4>
            <p class="text-sm text-wrap break-all font-mono">{{ signature }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-4 mt-1">
          <Button
            label="Close"
            icon="pi pi-times"
            severity="secondary"
            @click="viewDialogVisible = false" />
          <Button
            v-if="canSign(selectedAgreement)"
            :loading="signing"
            label="Sign Agreement"
            icon="pi pi-check"
            @click="handleSign" />
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="signDialogVisible"
      header="Sign Project Agreement"
      :modal="true"
      :style="{ width: '500px' }">
      <p>
        Are you sure you want to sign the project agreement
        <strong>{{ selectedAgreement?.projectAgreement?.title }}</strong
        >?
      </p>
      <p class="text-sm text-surface-500 dark:text-surface-400">
        By signing this agreement, you confirm that you have reviewed and agree
        to all terms and conditions outlined in the project agreement.
      </p>

      <template #footer>
        <div class="flex gap-4 mt-1">
          <Button
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            @click="signDialogVisible = false" />
          <Button
            :loading="signing"
            label="Sign"
            icon="pi pi-check"
            @click="confirmSign" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.agreement-details p {
  margin: 0.5rem 0;
  color: var(--text-color);
}

.agreement-details strong {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}
</style>
