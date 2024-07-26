<script setup lang="ts">
import { DataPlaneStateDto, DatasetConfig } from "@tsg-dsp/http-data-plane-dtos";
import { ref, onMounted } from "vue";
import { axiosInstance } from "../store";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import schema from "@tsg-dsp/common-ui/assets/dataset-config.schema.json";

const toast = useToast();
const confirm = useConfirm();

const state = ref<DataPlaneStateDto>();
const dataset = ref<DatasetConfig>();

const odrlOfferSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title:
    "Dataspace Protocol Message Offer (https://w3id.org/dspace/2024/1/negotiation/contract-schema.json#/definitions/MessageOffer)",
  type: "object",
  $ref: "https://w3id.org/dspace/2024/1/negotiation/contract-schema.json#/definitions/MessageOffer",
};

const odrlActions = [
  "odrl:delete",
  "odrl:execute",
  "cc:SourceCode",
  "odrl:anonymize",
  "odrl:extract",
  "odrl:read",
  "odrl:index",
  "odrl:compensate",
  "odrl:sell",
  "odrl:derive",
  "odrl:ensureExclusivity",
  "odrl:annotate",
  "cc:Reproduction",
  "odrl:translate",
  "odrl:include",
  "cc:DerivativeWorks",
  "cc:Distribution",
  "odrl:textToSpeech",
  "odrl:inform",
  "odrl:grantUse",
  "odrl:archive",
  "odrl:modify",
  "odrl:aggregate",
  "odrl:attribute",
  "odrl:nextPolicy",
  "odrl:digitize",
  "cc:Attribution",
  "odrl:install",
  "odrl:concurrentUse",
  "odrl:distribute",
  "odrl:synchronize",
  "odrl:move",
  "odrl:obtainConsent",
  "odrl:print",
  "cc:Notice",
  "odrl:give",
  "odrl:uninstall",
  "cc:Sharing",
  "odrl:reviewPolicy",
  "odrl:watermark",
  "odrl:play",
  "odrl:reproduce",
  "odrl:transform",
  "odrl:display",
  "odrl:stream",
  "cc:ShareAlike",
  "odrl:acceptTracking",
  "cc:CommericalUse",
  "odrl:present",
  "odrl:use",
];

const configRaw = ref(false);
const configString = ref<string>();
const configForm = ref<DatasetConfig>();
const rawPolicy = ref("{}");
const editModal = ref(false);

const updateLoading = ref(false);
const refreshLoading = ref(false);

const showDataset = ref(false);

const getState = async () => {
  try {
    const response = await axiosInstance.get<DataPlaneStateDto>(
      "management/state"
    );
    state.value = response.data;
  } catch (err) {
    const message =
      err.response?.data?.message ||
      "Could not load state from the HTTP data plane";
    toast.add({
      severity: "warn",
      summary: "Loading state failed",
      detail: message,
      life: 10000,
    });
  }
};

const fillFormProperties = (config: DatasetConfig) => {
  configForm.value = JSON.parse(JSON.stringify(config));
  if (!configForm.value.policy) {
    configForm.value.policy = {
      type: "default",
    };
  }
  configString.value = JSON.stringify(config, null, 2);
  rawPolicy.value = configForm.value.policy.raw
    ? JSON.stringify(configForm.value.policy.raw, null, 2)
    : JSON.stringify(
        {
          "@type": "odrl:Offer",
          "@id": `urn:uuid:${crypto.randomUUID()}`,
          "odrl:assigner": "did:web:...",
          "odrl:permission": [
            {
              "odrl:action": "odrl:use",
            },
          ],
        },
        null,
        2
      );
};

const getDatasetConfig = async () => {
  try {
    const response = await axiosInstance.get<DatasetConfig>(
      "management/dataset"
    );
    dataset.value = response.data;
    fillFormProperties(response.data);
  } catch (err) {
    const message =
      err.response?.data?.message ||
      "Could not load dataset config from the HTTP data plane";
    toast.add({
      severity: "warn",
      summary: "Loading dataset config failed",
      detail: message,
      life: 10000,
    });
  }
};

const update = async () => {
  updateLoading.value = true;
  try {
    let config: DatasetConfig;
    if (configRaw.value) {
      config = JSON.parse(configString.value);
    } else {
      config = configForm.value;
      if (config.policy?.type === "manual") {
        config.policy.raw = JSON.parse(rawPolicy.value);
        config.policy.permissions = undefined;
        config.policy.prohibitions = undefined;
      } else if (config.policy?.type === "rules") {
        config.policy.raw = undefined;
      } else if (config.policy?.type === "default") {
        config.policy.permissions = undefined;
        config.policy.prohibitions = undefined;
        config.policy.raw = undefined;
      }
    }
    await axiosInstance.put("management/dataset", config);
    editModal.value = false;
    await getDatasetConfig();
  } catch (err) {
    const message =
      err.response?.data?.message ||
      "Could not load dataset config from the HTTP data plane";
    toast.add({
      severity: "warn",
      summary: "Loading dataset config failed",
      detail: message,
      life: 10000,
    });
  }
  updateLoading.value = false;
};

const refreshRegistration = async () => {
  refreshLoading.value = true;
  try {
    await axiosInstance.post("management/refresh");
    await getDatasetConfig();
  } catch (err) {
    const message =
      err.response?.data?.message ||
      "Could not load dataset config from the HTTP data plane";
    toast.add({
      severity: "warn",
      summary: "Loading dataset config failed",
      detail: message,
      life: 10000,
    });
  }
  refreshLoading.value = false;
};

const emptyStringToUndefined = (containing, property) => {
  if (containing[property] == "") {
    containing[property] = undefined;
  }
};

const pushOrCreate = (containing, property, element) => {
  if (containing[property]) {
    containing[property].push(element);
  } else {
    containing[property] = [element];
  }
};

onMounted(async () => {
  await getState();
  await getDatasetConfig();
});
</script>

<template>
  <Card>
    <template #title>State</template>
    <template #subtitle>State of this HTTP data plane</template>
    <template #content>
      <div class="grid" v-if="state">
        <div class="col-12 lg:col-8">
          <FormField label="Identifier">{{ state.identifier }}</FormField>
          <FormField label="Type">{{ state.details.dataplaneType }}</FormField>
          <FormField label="Synchronization">{{
            state.details.catalogSynchronization
          }}</FormField>
          <FormField label="Role">{{ state.details.role }}</FormField>
          <FormField label="Dataset IDs">
            <div v-for="dataset in state.dataset">
              {{ dataset["@id"] }}
            </div>
          </FormField>
        </div>
        <div class="col-12 lg:col-4">
          <div>
            <Button
              icon="pi pi-refresh"
              severity="info"
              label="Refresh state at Control Plane"
              :loading="refreshLoading"
              @click="refreshRegistration"
            />
          </div>
          <div class="mt-3">
            <Button label="Show DCAT dataset" @click="showDataset = true" />
            <Dialog
              :dismissableMask="true"
              v-model:visible="showDataset"
              modal
              header="DCAT datasets"
              :style="{ width: '90vw', maxWidth: '75rem' }"
            >
              <MonacoEditorVue
                :static="state.dataset"
                :read-only="true"
                :max-lines="30"
              />
            </Dialog>
          </div>
          <div class="mt-3">
            <Button
              label="Update configuration"
              :loading="updateLoading"
              @click="editModal = true"
              severity="warning"
              type="submit"
            />
          </div>
        </div>
      </div>
    </template>
  </Card>
  <Card class="mt-5">
    <template #title>Dataset Configuration</template>
    <template #subtitle
      >Configuration of the datasets provided by this data plane</template
    >
    <template #content>
      <div v-if="dataset">
        <FormField label="Identifier">{{
          dataset.id || "Auto-generated"
        }}</FormField>
        <FormField label="Title">{{ dataset.title }}</FormField>
        <FormField label="Conforms To" v-if="dataset.conformsTo"
          ><a :href="dataset.conformsTo" target="_blank">{{
            dataset.conformsTo
          }}</a></FormField
        >
        <h4>Versions</h4>
        <div class="pl-3" v-for="(version, idx) in dataset.versions">
          <hr v-if="idx !== 0" />
          <FormField label="Identifier">{{
            version.id || "Auto-generated"
          }}</FormField>
          <FormField label="Version">{{ version.version }}</FormField>
          <FormField label="Backend">{{ version.backend }}</FormField>
          <FormField label="OpenAPI specification">{{
            version.openApiSpec || "None"
          }}</FormField>
          <FormField label="Authorization">
            <Inplace v-if="version.authorization">
              <template #display>Show authorization header</template>
              <template #content>{{ version.authorization }}</template>
            </Inplace>
            <template v-else>None</template>
          </FormField>
        </div>
        <h4>Policy</h4>
        <FormField label="Type"
          ><span class="capitalize">{{
            dataset.policy?.type || "default"
          }}</span></FormField
        >
        <FormField label="Raw" v-if="dataset.policy?.type === 'manual'">
          <MonacoEditorVue
            :static="dataset.policy?.raw"
            :read-only="true"
            :max-lines="15"
          />
        </FormField>
        <div class="pl-3" v-if="dataset.policy?.type === 'rules'">
          <h5>Permissions</h5>
          <div
            class="pl-3"
            v-for="(permission, idx) in dataset.policy?.permissions || []"
          >
            <hr v-if="idx !== 0" />
            <FormField label="Action">{{ permission.action }}</FormField>
            <FormField
              label="Constraint"
              v-for="constraint in permission.constraints"
              ><em>{{ constraint.type }}</em
              >: {{ constraint.value }}</FormField
            >
          </div>
          <div v-if="(dataset.policy?.permissions || []).length === 0">
            No permissions
          </div>
          <h5>Prohibitions</h5>
          <div
            class="pl-3"
            v-for="(prohibition, idx) in dataset.policy?.prohibitions || []"
          >
            <hr v-if="idx !== 0" />
            <FormField label="Action">{{ prohibition.action }}</FormField>
            <FormField
              label="Constraint"
              v-for="constraint in prohibition.constraints"
              ><em>{{ constraint.type }}</em
              >: {{ constraint.value }}</FormField
            >
          </div>
          <div v-if="(dataset.policy?.prohibitions ?? []).length === 0">
            No prohibitions
          </div>
        </div>
      </div>
      <div v-else>No provided datasets configured</div>
    </template>
  </Card>
  <Dialog
    v-model:visible="editModal"
    modal
    :dismissableMask="true"
    header="Update Configuration"
    :style="{ width: '95vw', maxWidth: '75rem' }"
  >
    <div v-if="configString">
      <div class="mb-3">
        <SelectButton
          v-model="configRaw"
          :options="[
            { value: false, label: 'Form' },
            { value: true, label: 'JSON' },
          ]"
          option-value="value"
          option-label="label"
          aria-labelledby="basic"
        />
      </div>
      <MonacoEditorVue
        v-if="configRaw"
        v-model="configString"
        :schema="schema"
        :maxLines="200"
        style="max-height: calc(90vh - 16rem)"
      />
      <FormField label="Identifier" v-slot="props" v-if="!configRaw">
        <InputText
          class="w-full"
          :id="props.id"
          v-model="configForm.id"
          @change="emptyStringToUndefined(configForm, 'id')"
          placeholder="Identifier (leave empty for an auto-generated identifier)"
        />
      </FormField>
      <FormField label="Title" v-slot="props" v-if="!configRaw">
        <InputText
          class="w-full"
          :id="props.id"
          v-model="configForm.title"
          placeholder="Title"
        />
      </FormField>
      <FormField label="Conforms To" v-slot="props" v-if="!configRaw">
        <InputText
          class="w-full"
          :id="props.id"
          v-model="configForm.conformsTo"
          placeholder="URL to Ontology/data model definitions"
        />
      </FormField>
      <TabView v-if="!configRaw">
        <TabPanel header="Versions">
          <FormField no-label
            ><small
              >The first listed version will be handled as default version, and
              the order of versions should be from newest to oldest.</small
            ></FormField
          >
          <FormField no-label>
            <Button
              label="Add version"
              icon="pi pi-plus"
              severity="success"
              @click="configForm.versions.unshift({ version: '', backend: '' })"
            />
          </FormField>
          <div v-for="(version, idx) in configForm.versions">
            <hr v-if="idx !== 0" />
            <FormField label="Identifier" v-slot="props">
              <InputText
                class="w-full"
                :id="props.id"
                v-model="version.id"
                @change="emptyStringToUndefined(version, 'id')"
                placeholder="Identifier (leave empty for an auto-generated identifier)"
              />
            </FormField>
            <FormField label="Version" v-slot="props">
              <InputText
                class="w-full"
                :id="props.id"
                v-model="version.version"
                placeholder="Version"
              />
            </FormField>
            <FormField label="Backend" v-slot="props">
              <InputText
                class="w-full"
                :id="props.id"
                v-model="version.backend"
                placeholder="Backend"
              />
            </FormField>
            <FormField label="OpenAPI specification" v-slot="props">
              <InputText
                class="w-full"
                :id="props.id"
                v-model="version.openApiSpec"
                @change="emptyStringToUndefined(version, 'openApiSpec')"
                placeholder="OpenAPI specification (leave empty for no specification)"
              />
              <small
                >The OpenAPI specification should refer to the JSON or YAML
                document directly.</small
              >
            </FormField>
            <FormField label="Authorization" v-slot="props">
              <Password
                class="w-full"
                input-class="w-full"
                toggleMask
                :feedback="false"
                :input-id="props.id"
                v-model="version.authorization"
                @change="emptyStringToUndefined(version, 'authorization')"
                placeholder="Authorization header, e.g. 'Basic XXX' or 'Bearer XXX' (leave empty for no specification)"
              />
              <small
                >The Authorization will be used for the connection between the
                data plane and the backend service.</small
              >
            </FormField>
            <FormField no-label
              ><Button
                label="Remove version"
                icon="pi pi-minus"
                severity="danger"
                @click="configForm.versions.splice(idx, 1)"
            /></FormField>
          </div>
        </TabPanel>
        <TabPanel header="Policy">
          <FormField label="Type">
            <SelectButton
              v-model="configForm.policy.type"
              :options="['default', 'rules', 'manual']"
              :option-label="(value) => value[0].toUpperCase() + value.slice(1)"
            />
          </FormField>
          <FormField label="Manual" v-if="configForm.policy?.type === 'manual'">
            <MonacoEditorVue
              v-model="rawPolicy"
              :schema="odrlOfferSchema"
              schema-warning
              :maxLines="25"
              :minLines="15"
            />
            <small
              >The warnings are based on a opiniated JSON-Schema of ODRL from
              the Dataspace Protocol, which does not cover all possibilities
              present in the JSON-LD structure.<br />So warnings might be
              presented regardless of whether the input is actually correct. And
              vice-versa, even when no warnings are presented the request might
              be rejected.</small
            >
          </FormField>
          <FormField
            label="Permissions"
            v-if="configForm.policy?.type === 'rules'"
          >
            <small
              >Permissions allow the defined action, when all constraints are
              met.</small
            >
            <hr />
            <div v-for="(permission, idx) in configForm.policy.permissions">
              <div class="font-bold py-2">Action</div>
              <Dropdown
                v-model="permission.action"
                editable
                :options="odrlActions"
                placeholder="Select or provide actions"
                class="w-full"
              />
              <div class="font-bold py-2">Constraints</div>
              <div class="grid grid-nogutter ml-3">
                <template v-for="(constraint, idx) in permission.constraints">
                  <div class="col-11 md:col-5">
                    <Dropdown
                      v-model="constraint.type"
                      class="w-full"
                      :options="['CredentialType', 'Recipient', 'License']"
                      placeholder="Constraint type"
                    />
                  </div>
                  <div class="col-11 md:col-6">
                    <InputText
                      class="w-full"
                      v-model="constraint.value"
                      placeholder="Value"
                    />
                  </div>
                  <div class="col-1">
                    <Button
                      size="small"
                      icon="pi pi-times"
                      @click="permission.constraints.splice(idx, 1)"
                      severity="danger"
                      outlined
                    />
                  </div>
                </template>
                <Button
                  class="mt-2"
                  label="Add constraint"
                  icon="pi pi-plus"
                  severity="info"
                  @click="
                    pushOrCreate(permission, 'constraints', {
                      type: '',
                      value: '',
                    })
                  "
                />
              </div>
              <Button
                class="mt-2"
                label="Remove permission"
                icon="pi pi-minus"
                severity="danger"
                @click="configForm.policy.permissions.splice(idx, 1)"
              />
              <hr />
            </div>
            <div
              class="py-2"
              v-if="
                !configForm.policy.permissions ||
                configForm.policy.permissions.length === 0
              "
            >
              No permissions
            </div>
            <Button
              label="Add permission"
              icon="pi pi-plus"
              severity="success"
              @click="
                pushOrCreate(configForm.policy, 'permissions', {
                  action: '',
                  constraints: [],
                })
              "
            />
          </FormField>
          <FormField
            label="Prohibitions"
            v-if="configForm.policy?.type === 'rules'"
          >
            <small
              >Prohibitions explicitly prohibit the defined action, when all
              constraints are met. If both permission(s) as prohibition(s) match
              for a given transfer, the prohibition(s) take precedence.</small
            >
            <hr />
            <div v-for="(prohibition, idx) in configForm.policy.prohibitions">
              <div class="font-bold py-2">Action</div>
              <Dropdown
                v-model="prohibition.action"
                editable
                :options="odrlActions"
                placeholder="Select or provide actions"
                class="w-full"
              />
              <div class="font-bold py-2">Constraints</div>
              <div class="grid grid-nogutter ml-3">
                <template v-for="(constraint, idx) in prohibition.constraints">
                  <div class="col-11 md:col-5">
                    <Dropdown
                      v-model="constraint.type"
                      class="w-full"
                      :options="['CredentialType', 'Recipient', 'License']"
                      placeholder="Constraint type"
                    />
                  </div>
                  <div class="col-11 md:col-6">
                    <InputText
                      class="w-full"
                      v-model="constraint.value"
                      placeholder="Value"
                    />
                  </div>
                  <div class="col-1">
                    <Button
                      size="small"
                      icon="pi pi-times"
                      @click="prohibition.constraints.splice(idx, 1)"
                      severity="danger"
                      outlined
                    />
                  </div>
                </template>
                <Button
                  class="mt-2"
                  label="Add constraint"
                  icon="pi pi-plus"
                  severity="info"
                  @click="
                    pushOrCreate(prohibition, 'constraints', {
                      type: '',
                      value: '',
                    })
                  "
                />
              </div>
              <Button
                class="mt-2"
                label="Remove prohibition"
                icon="pi pi-minus"
                severity="danger"
                @click="configForm.policy.prohibitions.splice(idx, 1)"
              />
              <hr />
            </div>
            <div
              class="py-2"
              v-if="
                !configForm.policy.prohibitions ||
                configForm.policy.prohibitions.length === 0
              "
            >
              No prohibitions
            </div>
            <Button
              label="Add prohibition"
              icon="pi pi-plus"
              severity="success"
              @click="
                pushOrCreate(configForm.policy, 'prohibitions', {
                  action: '',
                  constraints: [],
                })
              "
            />
          </FormField>
        </TabPanel>
      </TabView>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        text
        severity="secondary"
        @click="editModal = false"
      />
      <Button
        label="Update"
        :loading="updateLoading"
        @click="update"
        severity="success"
        type="submit"
      />
    </template>
  </Dialog>
</template>
