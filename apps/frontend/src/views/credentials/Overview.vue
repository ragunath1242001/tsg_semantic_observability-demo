<script setup lang="ts">
import { AppRole } from "@libs/dtos";
import { toArray } from "../../utils/union.js";
import { formatDate } from "../../utils/date.js";
import { axiosInstance, store } from "../../store/index.js";
import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";
import FormField from "../../components/FormField.vue";

interface Credential {
  id: string;
  targetDid: string;
  credential: VerifiableCredential<CredentialSubject>;
  selfIssued: boolean;
}

interface CredentialParsed {
  id: string;
  targetDid: string;
  issuer: string;
  type: string[];
  expirationDate: string;
  raw: Credential;
}

const toast = useToast();
const confirm = useConfirm();

const credentials = ref<CredentialParsed[]>();
const expandedRows = ref();

const manager = computed(
  () =>
    store.state.user?.roles.includes(AppRole.MANAGE_OWN_CREDENTIALS) ||
    store.state.user?.roles.includes(AppRole.MANAGE_ALL_CREDENTIALS) ||
    false
);

const loadCredentials = async () => {
  try {
    const response = await axiosInstance<Credential[]>(
      "management/credentials"
    );
    credentials.value = response.data.map((item) => {
      const subjectTypes = toArray(item.credential.credentialSubject).flatMap(
        (s) => [...toArray(s.type), ...toArray(s["@type"])]
      );
      const credentialTypes = new Set([
        ...item.credential.type,
        ...subjectTypes,
      ]);
      const simpleTypes = [...credentialTypes]
        .map((type) => type.split(/[/#]/g).slice(-1)[0])
        .filter((type) => type !== "VerifiableCredential");
      return {
        id: item.id.replace(`${item.targetDid}#`, ""),
        targetDid: item.targetDid,
        issuer:
          item.targetDid === item.credential.issuer
            ? "self"
            : item.credential.issuer,
        type: simpleTypes,
        expirationDate: formatDate(item.credential.expirationDate),
        raw: item,
      };
    });
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "API error",
      detail: "Could not load credentials",
      life: 10000,
    });
  }
};

const deleteCredential = async (credentialId: string) => {
  confirm.require({
    header: "Are you sure you want to delete this key?",
    message:
      "Existing credentials signed with this key cannotbe used for verifiable presentations anymore!",
    icon: "pi pi-info-circle",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await axiosInstance.delete(
          `management/credentials/${encodeURIComponent(credentialId)}`
        );
        await loadCredentials();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Key deleted",
          life: 3000,
        });
      } catch (err) {
        toast.add({
          severity: "warn",
          summary: "API error",
          detail: "Could not delete key",
          life: 10000,
        });
      }
    },
  });
};

const copyCredentialId = (credentialId: string) => {
  navigator.clipboard.writeText(credentialId);
  toast.add({
    severity: "success",
    summary: "Copied",
    detail: "Copied Credential ID to clipboard",
    life: 3000,
  });
};

const copyCredential = (
  credential: VerifiableCredential<CredentialSubject>
) => {
  navigator.clipboard.writeText(JSON.stringify(credential, null, 2));
  toast.add({
    severity: "success",
    summary: "Copied",
    detail: "Copied Credential JSON to clipboard",
    life: 3000,
  });
};

onMounted(async () => {
  await loadCredentials();
});
</script>

<template>
  <div>
    <Card>
      <template #title>Credentials</template>
      <template #subtitle>
        <p>Verifiable Credentials are digital credentials that can be securely issued, stored, and shared online. They provide a way for individuals to prove aspects of their identity or qualifications without revealing unnecessary personal information. These credentials are cryptographically secure, enabling verification by others without the need for a trusted third party. For more details see the <a href="https://www.w3.org/TR/vc-data-model-2.0/" target="_blank">Verifiable Credentials Data Model specification</a>.</p>
        <p>The table below shows all credentials that are issued and imported into this Wallet instance.</p>
      </template>
      <template #content>
        <DataTable
          v-model:expanded-rows="expandedRows"
          :value="credentials"
          sort-field="id"
          :sort-order="1"
          paginator
          :rows="10"
        >
          <Column expander style="width: 5rem" />
          <Column field="id" header="ID">
            <template #body="props">
              <code
                class="text-sm block white-space-nowrap overflow-hidden text-overflow-ellipsis"
                style="width: 36ch"
                >{{
                  props.data.id.replace(`${props.data.targetDid}#`, "")
                }}</code
              >
            </template>
          </Column>
          <Column field="targetDid" header="Target (Issuer)" class="text-sm">
            <template #body="props">
              <code
                class="block white-space-nowrap overflow-hidden text-overflow-ellipsis"
                style="max-width: 50ch"
                >{{ props.data.targetDid }}</code
              ><br />
              <small
                ><code
                  class="block white-space-nowrap overflow-hidden text-overflow-ellipsis"
                  >({{ props.data.issuer }})</code
                ></small
              >
            </template>
          </Column>
          <Column field="type" header="Type">
            <template #body="props">
              <Tag
                class="mr-1 mb-1"
                v-for="type in props.data.type"
                :value="type"
                severity="info"
              ></Tag>
            </template>
          </Column>
          <Column field="expirationDate" header="Expiration" />
          <Column field="actions" header="Actions">
            <template #body="props">
              <Button
                severity="danger"
                icon="pi pi-times"
                :disabled="props.data.default"
                @click="deleteCredential(props.data.id)"
              />
            </template>
          </Column>
          <template #expansion="props">
            <div>
              <Button
                class="mr-2"
                label="Copy Credential ID"
                @click="copyCredentialId(props.data.raw.id)"
              />
              <Button
                label="Copy Credential"
                @click="copyCredential(props.data.raw.credential)"
              />
            </div>

            <h3>Proof</h3>
            <FormField label="Type">{{
              props.data.raw.credential.proof.type
            }}</FormField>
            <FormField label="Issuance date">{{
              formatDate(props.data.raw.credential.issuanceDate)
            }}</FormField>
            <FormField label="Expiration date">{{
              formatDate(props.data.raw.credential.expirationDate)
            }}</FormField>
            <FormField label="Created">{{
              formatDate(props.data.raw.credential.proof.created)
            }}</FormField>
            <FormField label="Purpose">{{
              props.data.raw.credential.proof.proofPurpose
            }}</FormField>
            <FormField label="Verification"
              ><code>{{
                props.data.raw.credential.proof.verificationMethod
              }}</code></FormField
            >

            <h3>Credential subject</h3>
            <div>
              <MonacoEditorVue
                :static="props.data.raw.credential.credentialSubject"
                :read-only="true"
                :min-lines="1"
                :max-lines="100"
                />
            </div>
          </template>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.p-multiselect {
  min-width: 17rem;
}
.p-multiselect-label {
  display: flex;
  flex-wrap: wrap;
}
.p-multiselect-token {
  margin: 0.1rem;
}
</style>
