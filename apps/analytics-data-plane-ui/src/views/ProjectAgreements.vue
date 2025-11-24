<script setup lang="ts">
import type { ProjectAgreementDetailDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { useToast } from "primevue/usetoast";
import { ref, useTemplateRef } from "vue";

import CreateProjectAgreement from "../components/project-agreements/CreateProjectAgreement.vue";
import ProjectAgreements from "../components/project-agreements/ProjectAgreements.vue";

const toast = useToast();
const activeTab = ref("0");
const projectAgreements = useTemplateRef("project-agreements");
const handleCreated = (agreement: ProjectAgreementDetailDto) => {
  toast.add({
    severity: "success",
    summary: "Agreement Created",
    detail: `Project agreement "${agreement.projectAgreement.title}" has been created and sent to participants for signature.`,
    life: 5000
  });
  projectAgreements.value.loadAgreements();
  activeTab.value = "0";
};

const handleCancel = () => {
  activeTab.value = "0";
};
</script>

<template>
  <div>
    <Card>
      <template #title>Project Agreements</template>
      <template #subtitle
        >Manage project agreements for collaborative data sharing and
        analytics.</template
      >
      <template #content>
        <Tabs v-model:value="activeTab">
          <TabList>
            <Tab value="0">Project Agreements</Tab>
            <Tab value="1">Create Agreement</Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="0">
              <ProjectAgreements ref="project-agreements" />
            </TabPanel>
            <TabPanel value="1">
              <CreateProjectAgreement
                @cancel="handleCancel"
                @created="handleCreated" />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </template>
    </Card>
  </div>
</template>
