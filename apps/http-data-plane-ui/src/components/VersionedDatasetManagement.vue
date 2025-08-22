<script setup lang="ts">
import { DataPlaneStateDto } from "@tsg-dsp/common-dtos";
import schema from "@tsg-dsp/common-ui/assets/dataset-config.schema.json";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { VersionedDatasetConfig } from "@tsg-dsp/http-data-plane-dtos";
import { useToast } from "primevue/usetoast";
import { onMounted, ref, watch } from "vue";

import { cleanPolicyConfig } from "../utils/policyconfig";
import PolicyEditor from "./PolicyEditor.vue";
import PolicyView from "./PolicyView.vue";

const toast = useToast();

const props = defineProps({
  state: DataPlaneStateDto,
  config: VersionedDatasetConfig
});

const emits = defineEmits(["update"]);

watch(props.config, (config) => {
  fillFormProperties(config);
});

const configRaw = ref(false);
const configString = ref<string>();
const configForm = ref<VersionedDatasetConfig>();
const editModal = ref(false);

const updateLoading = ref(false);
const refreshLoading = ref(false);

const fillFormProperties = (config?: VersionedDatasetConfig) => {
  configForm.value = JSON.parse(JSON.stringify(config));
  if (!configForm.value.policy) {
    configForm.value.policy = {
      type: "default"
    };
  }
  configString.value = JSON.stringify(config, null, 2);
};

const update = async () => {
  updateLoading.value = true;
  try {
    let config: VersionedDatasetConfig;
    if (configRaw.value) {
      config = JSON.parse(configString.value);
    } else {
      config = configForm.value;
      config.policy = cleanPolicyConfig(configForm.value.policy);
    }
    await http.put("management/config", config);
    editModal.value = false;
    emits("update");
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Loading dataset config failed",
        defaultMessage: `Could not load dataset config from the HTTP data plane`
      })
    );
  }
  updateLoading.value = false;
};

const refreshRegistration = async () => {
  refreshLoading.value = true;
  try {
    await http.post("management/refresh");
    emits("update");
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Refreshing registration failed",
        defaultMessage: `Could not refresh registration at the HTTP data plane`
      })
    );
  }
  refreshLoading.value = false;
};

const emptyStringToUndefined = (containing, property) => {
  if (containing[property] == "") {
    containing[property] = undefined;
  }
};

onMounted(() => {
  fillFormProperties(props.config);
});
</script>

<template>
  <Card>
    <template #title>State</template>
    <template #subtitle>State of this HTTP data plane</template>
    <template #content>
      <div v-if="state" class="grid grid-cols-12 gap-4">
        <div class="col-span-12 min-[1024px]:col-span-8">
          <FormField class="mb-1" :label-width="3" label="Identifier">{{
            state.identifier
          }}</FormField>
          <FormField class="mb-1" :label-width="3" label="Type">{{
            state.details.dataplaneType
          }}</FormField>
          <FormField class="mb-1" :label-width="3" label="Synchronization">{{
            state.details.catalogSynchronization
          }}</FormField>
          <FormField class="mb-1" :label-width="3" label="Role">{{
            state.details.role
          }}</FormField>
        </div>
        <div class="col-span-12 min-[1024px]:col-span-4">
          <div>
            <Button
              icon="pi pi-refresh"
              severity="info"
              label="Refresh state at Control Plane"
              :loading="refreshLoading"
              @click="refreshRegistration" />
          </div>
          <div class="mt-4">
            <Button
              label="Update configuration"
              :loading="updateLoading"
              severity="warn"
              type="submit"
              @click="editModal = true" />
          </div>
        </div>
      </div>
    </template>
  </Card>
  <Card class="mt-8">
    <template #title>Dataset Configuration</template>
    <template #subtitle
      >Configuration of the datasets provided by this data plane</template
    >
    <template #content>
      <div v-if="config">
        <FormField class="mb-1" label="Identifier">{{
          config.id || "Auto-generated"
        }}</FormField>
        <FormField class="mb-1" label="Title">{{ config.title }}</FormField>
        <FormField
          v-if="config.baseSemanticModelRef"
          class="mb-1"
          label="Conforms To">
          <div class="truncate">
            <a :href="config.baseSemanticModelRef" target="_blank">{{
              config.baseSemanticModelRef
            }}</a>
          </div>
        </FormField>
        <h4>Versions</h4>
        <div v-for="(version, idx) in config.versions" :key="idx" class="pl-4">
          <hr v-if="idx !== 0" />
          <FormField class="mb-1" label="Identifier">{{
            version.id || "Auto-generated"
          }}</FormField>
          <FormField class="mb-1" label="Version">{{
            version.version
          }}</FormField>
          <FormField class="mb-1" label="Message model URL">{{
            version.semanticModelRef
          }}</FormField>
          <FormField class="mb-1" label="Authorization">
            <Inplace v-if="version.authorization">
              <template #display>Show authorization header</template>
              <template #content>{{ version.authorization }}</template>
            </Inplace>
            <template v-else>None</template>
          </FormField>
        </div>
        <h4>Policy</h4>
        <PolicyView :policy="config.policy" />
      </div>
      <div v-else>No provided datasets configured</div>
    </template>
  </Card>
  <Dialog
    v-model:visible="editModal"
    modal
    :dismissable-mask="true"
    header="Update Configuration"
    :style="{ width: '95vw', maxWidth: '75rem' }">
    <div v-if="configString">
      <div class="mb-4">
        <SelectButton
          v-model="configRaw"
          :options="[
            { value: false, label: 'Form' },
            { value: true, label: 'JSON' }
          ]"
          option-value="value"
          option-label="label"
          aria-labelledby="basic" />
      </div>
      <MonacoEditorVue
        v-if="configRaw"
        v-model="configString"
        :schema="schema"
        :max-lines="200"
        style="max-height: calc(90vh - 16rem)" />
      <FormField
        v-if="!configRaw"
        v-slot="props"
        class="mb-1"
        label="Identifier">
        <InputText
          :id="props.id"
          v-model="configForm.id"
          class="w-full"
          placeholder="Identifier (leave empty for an auto-generated identifier)"
          @change="emptyStringToUndefined(configForm, 'id')" />
      </FormField>
      <FormField v-if="!configRaw" v-slot="props" class="mb-1" label="Title*">
        <InputText
          :id="props.id"
          v-model="configForm.title"
          class="w-full"
          placeholder="Title" />
      </FormField>
      <FormField
        v-if="!configRaw"
        v-slot="props"
        class="mb-1"
        label="Base semantic model">
        <InputText
          :id="props.id"
          v-model="configForm.baseSemanticModelRef"
          class="w-full"
          placeholder="URL to base/abstract semantic model definitions" />
      </FormField>
      <FormField
        v-if="!configRaw"
        v-slot="props"
        class="mb-1"
        label="Current version*">
        <Select
          :id="props.id"
          v-model="configForm.currentVersion"
          class="w-full"
          :options="configForm.versions"
          option-label="version"
          option-value="version"
          placeholder="Current version" />
      </FormField>
      <FormField class="mb-1" no-label>
        <small>Fields marked with an asterisk (*) are required.</small>
      </FormField>
      <br />
      <Tabs v-if="!configRaw" value="Versions">
        <TabList>
          <Tab value="Versions">Versions</Tab>
          <Tab value="Policy">Policy</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="Versions">
            <FormField class="mb-1" no-label>
              <Button
                label="Add version"
                icon="pi pi-plus"
                severity="success"
                @click="
                  configForm.versions.unshift({
                    version: '',
                    distributions: [
                      {
                        backendUrl: ''
                      }
                    ]
                  })
                " />
            </FormField>
            <div v-for="(version, idx) in configForm.versions" :key="idx">
              <br v-if="idx !== 0" />
              <FormField v-slot="props" class="mb-1" label="Identifier">
                <InputText
                  :id="props.id"
                  v-model="version.id"
                  class="w-full"
                  placeholder="Identifier (leave empty for an auto-generated identifier)"
                  @change="emptyStringToUndefined(version, 'id')" />
              </FormField>
              <FormField v-slot="props" class="mb-1" label="Version*">
                <InputText
                  :id="props.id"
                  v-model="version.version"
                  class="w-full"
                  placeholder="Version string, e.g. semver like '0.3.1'" />
              </FormField>
              <FormField v-slot="props" class="mb-1" label="Semantic model">
                <InputText
                  :id="props.id"
                  v-model="version.semanticModelRef"
                  class="w-full"
                  placeholder="URL to the semantic model of this dataset version"
                  @change="
                    emptyStringToUndefined(version, 'semanticModelRef')
                  " />
              </FormField>
              <FormField v-slot="props" class="mb-1" label="Media type">
                <InputText
                  :id="props.id"
                  v-model="version.distributions[0].mediaType"
                  class="w-full"
                  placeholder="Media type, defaults to 'application/http'" />
              </FormField>
              <FormField v-slot="props" class="mb-1" label="Schema">
                <InputText
                  :id="props.id"
                  v-model="version.distributions[0].schemaRef"
                  class="w-full"
                  placeholder="URL to the message schema of this dataset version"
                  @change="
                    emptyStringToUndefined(
                      version.distributions[0],
                      'schemaRef'
                    )
                  " />
              </FormField>
              <FormField
                v-slot="props"
                class="mb-1"
                label="OpenAPI specification">
                <InputText
                  :id="props.id"
                  v-model="version.distributions[0].openApiSpecRef"
                  class="w-full"
                  placeholder="OpenAPI specification (leave empty for no specification)"
                  @change="
                    emptyStringToUndefined(
                      version.distributions[0],
                      'openApiSpecRef'
                    )
                  " />
                <small
                  >The OpenAPI specification should refer to the JSON or YAML
                  document directly.</small
                >
              </FormField>
              <FormField v-slot="props" class="mb-1" label="Backend URL*">
                <InputText
                  :id="props.id"
                  v-model="version.distributions[0].backendUrl"
                  class="w-full"
                  placeholder="URL pointing to the data access point"
                  @change="
                    emptyStringToUndefined(
                      version.distributions[0],
                      'backendUrl'
                    )
                  " />
              </FormField>
              <FormField v-slot="props" class="mb-1" label="Authorization">
                <Password
                  v-model="version.authorization"
                  class="w-full"
                  input-class="w-full"
                  toggle-mask
                  :feedback="false"
                  :input-id="props.id"
                  placeholder="Authorization header, e.g. 'Basic XXX' or 'Bearer XXX' (leave empty for no specification)"
                  @change="emptyStringToUndefined(version, 'authorization')" />
                <small
                  >The Authorization will be used for the connection between the
                  data plane and the backend service.</small
                >
              </FormField>
              <FormField class="mb-1" no-label
                ><Button
                  label="Remove version"
                  icon="pi pi-minus"
                  severity="danger"
                  @click="configForm.versions.splice(idx, 1)"
              /></FormField>
            </div>
          </TabPanel>
          <TabPanel value="Policy">
            <PolicyEditor v-model="configForm.policy" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        text
        severity="secondary"
        @click="editModal = false" />
      <Button
        label="Update"
        :loading="updateLoading"
        severity="success"
        type="submit"
        @click="update" />
    </template>
  </Dialog>
</template>
