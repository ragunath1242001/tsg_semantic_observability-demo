<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { IssueConfiguration } from "@tsg-dsp/wallet-dtos";
import { FileUploadUploaderEvent } from "primevue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

const userStore = useUserStore();

import IssueMetaSchema from "@/assets/issue-meta-schema.json";
import CredentialPreview from "@/components/CredentialPreview.vue";

type IssueConfigurationForm = Omit<
  IssueConfiguration,
  "document" | "schema"
> & {
  document: string;
  schema: string;
};

const toast = useToast();
const confirm = useConfirm();

const expandedRows = ref();
const currentOrigin = ref(window.location.origin);

const useBackgroundUrl = ref(false);

const issueConfigurations = ref<IssueConfiguration[]>([]);
const documentRef = ref("Referenced");

const defaultConfiguration: () => IssueConfigurationForm = () => ({
  id: "",
  credentialType: "",
  proofType: "jwt",
  documentUrl: undefined,
  document: "",
  schema: JSON.stringify(
    {
      type: "object",
      additionalProperties: true,
      properties: {}
    },
    null,
    2
  ),
  name: "",
  description: "",
  backgroundColor: "#dddddd",
  textColor: "#000000",
  backgroundImage: ""
});

const configurationForm = ref<IssueConfigurationForm>(defaultConfiguration());

const getFirstClaimExample = (schema: any): string | undefined => {
  if (!schema || !schema.properties) return undefined;
  const firstProperty = Object.entries(schema.properties)[0] as [string, any];
  if (firstProperty[1]?.type === "object") {
    return getFirstClaimExample(firstProperty);
  }
  return firstProperty[1]?.example || `[${firstProperty[0]}]`;
};

const firstClaimExample = computed(() => {
  try {
    const schema: any =
      configurationForm.value.schema.trim() !== ""
        ? JSON.parse(configurationForm.value.schema)
        : undefined;
    if (!schema || !schema.properties) return undefined;
    const firstProperty = Object.entries(schema.properties)[0] as [string, any];
    if (firstProperty[1]?.type === "object") {
      return getFirstClaimExample(firstProperty);
    }
    return firstProperty[1]?.example || `[${firstProperty[0]}]`;
  } catch (_error) {
    return undefined;
  }
});

const handleUpload = async (event: FileUploadUploaderEvent) => {
  try {
    const file = Array.isArray(event.files) ? event.files[0] : event.files;
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      configurationForm.value.backgroundImage = await new Promise(
        (resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        }
      );
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to upload file",
        defaultMessage: "Could not upload file"
      })
    );
    console.error("Error:", error);
    throw error;
  }
};

const loadIssueConfigurations = async () => {
  try {
    const response = await http<IssueConfiguration[]>(
      "management/issue-configurations"
    );
    issueConfigurations.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not load issue configurations",
        defaultMessage: `Error in fetching registered issue configurations`
      })
    );
  }
};

const deleteConfiguration = async (configurationId: string) => {
  confirm.require({
    header: "Are you sure you want to delete this configuration?",
    message:
      "This configuration might be used by other parties to find relevant endpoints!",
    icon: "pi pi-info-circle",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await http.delete(
          `management/issue-configurations/${encodeURIComponent(configurationId)}`
        );
        await loadIssueConfigurations();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Configuration deleted",
          life: 3000
        });
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: "Could not delete configuration",
            defaultMessage: `Error in deleting configuration`
          })
        );
      }
    }
  });
};

const editConfiguration = (configuration: IssueConfiguration) => {
  configurationForm.value = {
    ...configuration,
    document: configuration.document
      ? JSON.stringify(configuration.document, null, 2)
      : "",
    schema: configuration.schema
      ? JSON.stringify(configuration.schema, null, 2)
      : "",
    backgroundColor: configuration.backgroundColor ?? "#dddddd",
    textColor: configuration.textColor ?? "#000000"
  };

  documentRef.value = configuration.document ? "Hosted" : "Referenced";

  useBackgroundUrl.value =
    configuration.backgroundImage &&
    configuration.backgroundImage.startsWith("http");
};

const emptyStringToUndefined = (
  value: string | undefined
): string | undefined => {
  return value && value.trim() !== "" ? value : undefined;
};

const addConfiguration = async () => {
  try {
    if (documentRef.value === "Hosted") {
      configurationForm.value.documentUrl = undefined;
    } else {
      configurationForm.value.document = "";
    }
    const issueConfiguration: IssueConfiguration = {
      id: configurationForm.value.id,
      credentialType: configurationForm.value.credentialType,
      proofType: configurationForm.value.proofType,
      documentUrl: configurationForm.value.documentUrl,
      document:
        configurationForm.value.document.trim() !== ""
          ? JSON.parse(configurationForm.value.document)
          : undefined,
      schema:
        configurationForm.value.schema.trim() !== ""
          ? JSON.parse(configurationForm.value.schema)
          : undefined,
      name: emptyStringToUndefined(configurationForm.value.name),
      description: emptyStringToUndefined(configurationForm.value.description),
      backgroundColor: emptyStringToUndefined(
        configurationForm.value.backgroundColor
      ),
      textColor: emptyStringToUndefined(configurationForm.value.textColor),
      backgroundImage: emptyStringToUndefined(
        configurationForm.value.backgroundImage
      )
    };
    if (
      issueConfigurations.value.some((c) => c.id === configurationForm.value.id)
    ) {
      confirm.require({
        header: "Are you sure you want to update this configuration?",
        message:
          "This will overwrite the existing configuration with the same ID!",
        icon: "pi pi-info-circle",
        rejectLabel: "Cancel",
        acceptLabel: "Update",
        rejectClass: "p-button-secondary p-button-outlined",
        acceptClass: "p-button-warning",
        accept: async () => {
          try {
            await http.put(
              `management/issue-configurations/${encodeURIComponent(issueConfiguration.id)}`,
              issueConfiguration
            );
            await loadIssueConfigurations();
            toast.add({
              severity: "success",
              summary: "Success",
              detail: "Configuration updated",
              life: 3000
            });
            configurationForm.value = defaultConfiguration();
            useBackgroundUrl.value = false;
          } catch (error) {
            toast.add(
              toastError({
                error,
                summary: "Could not update configuration",
                defaultMessage: `Error in updating configuration`
              })
            );
          }
        }
      });
    } else {
      await http.post("management/issue-configurations", issueConfiguration);
      await loadIssueConfigurations();
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Configuration added",
        life: 3000
      });
      configurationForm.value = defaultConfiguration();
      useBackgroundUrl.value = false;
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not add configuration",
        defaultMessage: `Error in inserting new configuration to the wallet`
      })
    );
  }
};

onMounted(async () => {
  await loadIssueConfigurations();
});
</script>

<template>
  <div>
    <Card>
      <template #title>Issue Configurations</template>
      <template #subtitle>
        <p>
          Credential issue configurations are used to define the structure of
          credentials issued by the wallet. They include the JSON-LD context,
          schema, and other metadata that can be used to show the relevant
          information in the wallet UI. These configurations are essential for
          the issuance of Verifiable Credentials.
        </p>
        <p>
          JSON-LD contexts provide a standardized way to define the structure
          and meaning of data within Verifiable Credentials. It allows for
          interoperability and understanding between different systems and
          applications by establishing common terms and vocabulary. This context
          enables Verifiable Credentials to be exchanged and verified
          consistently across diverse environments, ensuring clarity and trust
          in digital transactions.
        </p>
        <p>
          Within the TSG wallet, these JSON-LD contexts can be accompanied with
          a JSON Schema. This JSON schema is used in UI elements to assist in
          the issuance of credentials.
        </p>
        <p>
          The table below shows all context registered with this Wallet
          instance, currently each context corresponds with one credential type.
        </p>
      </template>
      <template #content>
        <DataTable
          v-model:expanded-rows="expandedRows"
          :value="issueConfigurations"
          sort-field="id"
          :sort-order="1"
          paginator
          :rows="10">
          <Column expander style="width: 5rem" />
          <Column field="id" header="ID" />
          <Column field="credentialType" header="Credential Type" />
          <Column field="proofType" header="Proof Type" />
          <Column field="schema" header="Schema">
            <template #body="props">
              <i
                v-if="props.data.schema"
                class="pi pi-check-circle text-green-500" />
              <i v-else class="pi pi-times-circle text-red-500" />
            </template>
          </Column>
          <Column field="document" header="Document">
            <template #body="props">
              <span v-if="props.data.document">Hosted</span>
              <span v-else>Referenced</span>
            </template>
          </Column>
          <Column field="actions" header="Actions">
            <template #body="props">
              <Button
                severity="warn"
                icon="pi pi-pencil"
                class="mr-2"
                @click="editConfiguration(props.data)" />
              <Button
                severity="danger"
                icon="pi pi-times"
                @click="deleteConfiguration(props.data.id)" />
            </template>
          </Column>
          <template #expansion="props">
            <FormField label="Context ID">
              {{ props.data.id }}
            </FormField>
            <FormField label="Credential Type">
              <code>{{ props.data.credentialType }}</code>
            </FormField>
            <FormField label="Proof Type">
              <code>{{
                props.data.proofType === "jwt" ? "JWT" : "Linked Data Proof"
              }}</code>
            </FormField>
            <FormField v-if="props.data.documentUrl" label="Document URL">
              <a :href="props.data.documentUrl" target="_blank">
                <code>{{ props.data.documentUrl }}</code>
              </a>
            </FormField>
            <FormField v-if="props.data.document" label="Document">
              <Inplace>
                <template #display
                  ><strong>Show raw JSON-LD document</strong></template
                >
                <template #content>
                  <MonacoEditorVue
                    v-model="props.data.document"
                    :read-only="true"
                    :min-lines="1"
                    :max-lines="20" />
                </template>
              </Inplace>
            </FormField>
            <FormField v-if="props.data.schema" label="Schema">
              <Inplace>
                <template #display
                  ><strong>Show raw JSON schema</strong></template
                >
                <template #content>
                  <MonacoEditorVue
                    :static="props.data.schema"
                    :read-only="true"
                    :min-lines="1"
                    :max-lines="20" />
                </template>
              </Inplace>
            </FormField>
            <FormField v-if="props.data.name" label="Name">
              {{ props.data.name }}
            </FormField>
            <FormField v-if="props.data.description" label="Description">
              {{ props.data.description }}
            </FormField>
            <FormField
              v-if="props.data.backgroundColor"
              label="Background Color">
              <span
                class="w-6 h-6 inline-block rounded-full border-2 border-gray-300"
                :style="{ backgroundColor: props.data.backgroundColor }"></span>
              <code>{{ props.data.backgroundColor }}</code>
            </FormField>
            <FormField v-if="props.data.textColor" label="Text Color">
              <span
                class="w-6 h-6 inline-block rounded-full border-2 border-gray-300"
                :style="{ backgroundColor: props.data.textColor }"></span>
              <code>{{ props.data.textColor }}</code>
            </FormField>
            <FormField
              v-if="props.data.backgroundImage"
              label="Background Image">
              <img
                :src="props.data.backgroundImage"
                :style="{
                  backgroundColor: props.data.backgroundColor || '#dddddd'
                }"
                alt="Background"
                class="p-3 h-32 object-contain" />
            </FormField>
            <FormField label="Example">
              <CredentialPreview
                :configuration="props.data"
                :example="getFirstClaimExample(props.data.schema)"
                :placeholders="false" />
            </FormField>
          </template>
        </DataTable>
      </template>
    </Card>
    <Card v-if="!userStore.isReadOnly" class="mt-8">
      <template #title>Add/update configuration</template>
      <template #subtitle>
        <p>
          This form can be used to register a new configuration or update an
          existing configuration to this Wallet. Configurations are used to
          issue credentials.
        </p>
        <p>
          The context is associated with one credential type. If you want to use
          an existing JSON-LD context that targets multiple credentials, the
          same document reference can be used multiple times.
        </p>
      </template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="addConfiguration">
          <FormField v-slot="props" label="Configuration ID">
            <InputText
              :id="props.id"
              v-model="configurationForm.id"
              class="w-full"
              placeholder="Short configuration identifier"
              required />
          </FormField>
          <FormField v-slot="props" label="Credential Type">
            <InputText
              :id="props.id"
              v-model="configurationForm.credentialType"
              class="w-full"
              placeholder="Credential type associated with this configuration"
              required />
          </FormField>
          <FormField v-slot="props" label="Proof Type">
            <SelectButton
              :id="props.id"
              v-model="configurationForm.proofType"
              class="mb-2"
              :allow-empty="false"
              :options="['jwt', 'ldp']"
              aria-labelledby="basic" />
            <div>
              <small
                >The proof type determines how the credential is signed, either
                using a JWT or Linked Data Proof proof.</small
              >
            </div>
          </FormField>
          <FormField v-slot="props" label="Document">
            <SelectButton
              v-model="documentRef"
              class="mb-2"
              :allow-empty="false"
              :options="['Referenced', 'Hosted']"
              aria-labelledby="basic" />
            <div
              v-if="documentRef === 'Referenced'"
              class="flex flex-col gap-2">
              <InputText
                :id="props.id"
                v-model="configurationForm.documentUrl"
                class="w-full"
                placeholder="https://..."
                required />
              <small
                >Provide the https link to the JSON-LD context to be used</small
              >
            </div>
            <template v-else>
              <MonacoEditorVue
                v-model="configurationForm.document"></MonacoEditorVue>
              <small
                >Provide the contents of the JSON-LD context to be used, the
                context will be available at
                {{ currentOrigin }}/issue-configurations/CONTEXT_ID</small
              >
            </template>
          </FormField>
          <FormField label="Schema">
            <MonacoEditorVue
              v-model="configurationForm.schema"
              :schema="IssueMetaSchema"></MonacoEditorVue>
            <small
              >The JSON schema should target the
              <code>credentialSubject</code> property of a Verifable Credential.
              Use <code>title</code> and <code>example</code> in the properties
              to allow for human readable claims.<br />The first claim will be
              displayed on the card, other claims are shown in detailed views.
            </small>
          </FormField>
          <FormField v-slot="props" label="Name">
            <InputText
              :id="props.id"
              v-model="configurationForm.name"
              class="w-full"
              placeholder="Human readable name for this configuration" />
          </FormField>
          <FormField v-slot="props" label="Description">
            <InputText
              :id="props.id"
              v-model="configurationForm.description"
              class="w-full"
              placeholder="Description of this configuration" />
          </FormField>
          <FormField v-slot="props" label="Background Color">
            <div class="items-center inline-flex w-full gap-3">
              <ColorPicker
                :id="props.id"
                v-model="configurationForm.backgroundColor"
                format="hex"
                inline
                @change="
                  ({ value }) =>
                    (configurationForm.backgroundColor = `#${value}`)
                " />
              <InputText
                :id="props.id"
                v-model="configurationForm.backgroundColor"
                class="h-12 w-24 !font-mono"
                placeholder="Background color for this configuration" />
            </div>
          </FormField>
          <FormField v-slot="props" label="Text Color">
            <div class="items-center inline-flex w-full gap-3">
              <ColorPicker
                :id="props.id"
                v-model="configurationForm.textColor"
                format="hex"
                inline
                @change="
                  ({ value }) => (configurationForm.textColor = `#${value}`)
                " />
              <InputText
                :id="props.id"
                v-model="configurationForm.textColor"
                class="h-12 w-24 !font-mono"
                placeholder="Text color for this configuration" />
            </div>
          </FormField>
          <FormField label="Background Image">
            <SelectButton
              v-model="useBackgroundUrl"
              class="mb-2"
              :allow-empty="false"
              :options="[
                { name: 'Use upload', value: false },
                { name: 'Use URL', value: true }
              ]"
              option-label="name"
              option-value="value"
              aria-labelledby="basic" />
            <div class="items-center inline-flex w-full gap-3">
              <div class="bg-white">
                <img
                  v-if="configurationForm.backgroundImage"
                  :src="configurationForm.backgroundImage"
                  :style="{
                    backgroundColor:
                      configurationForm.backgroundColor || '#dddddd'
                  }"
                  alt="Background"
                  class="p-3 h-32 object-contain" />
              </div>
              <FileUpload
                v-if="!useBackgroundUrl"
                mode="basic"
                name="file"
                choose-icon="pi pi-pencil"
                custom-upload
                accept="image/*"
                :max-file-size="1000000"
                :auto="true"
                choose-label="Change"
                @uploader="handleUpload" />
              <div v-else>
                <InputText
                  v-model="configurationForm.backgroundImage"
                  class="w-full" />
                <small
                  >Provide a data URL for the background image for this
                  configuration, this image will be used in the UI when issuing
                  credentials based on this configuration.</small
                >
              </div>
            </div>
            <br />
            <small>A square transparent PNG works best</small>
          </FormField>
          <FormField label="Example">
            <CredentialPreview
              :configuration="configurationForm"
              :example="firstClaimExample"
              :placeholders="true" />
          </FormField>
          <FormField no-label>
            <Button
              v-if="
                issueConfigurations.some((c) => c.id === configurationForm.id)
              "
              label="Update configuration"
              type="submit"
              severity="warn" />
            <Button v-else label="Add configuration" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>
