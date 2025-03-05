<script setup lang="ts">
import { toArray } from "@tsg-dsp/common-ui/utils/union.js";
import { formatDate, formatRelative } from "@tsg-dsp/common-ui/utils/date.js";
import { CredentialStatus, VerifiableCredential } from "@tsg-dsp/common-dsp";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import http from "@tsg-dsp/common-ui/utils/http";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { VerifiedCredentialStatus } from "@tsg-dsp/wallet-dtos";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { AxiosResponse } from "axios";
import { setupPagination } from "@tsg-dsp/common-ui/utils/pagination";
import { DataTableSortEvent } from "primevue/datatable";

dayjs.extend(relativeTime);

interface Credential {
  id: string;
  targetDid: string;
  credential: VerifiableCredential;
  selfIssued: boolean;
}

interface FetchedStatus {
  message: string;
  statusListCredential: string;
  statusListIndex: string;
  statusPurpose: "refresh" | "revocation" | "suspension" | "message";
  status: boolean;
}

interface CredentialParsed {
  id: string;
  targetDid: string;
  issuer: string;
  type: string[];
  expirationDate: string;
  expirationSeverity: "secondary" | "warn" | "danger";
  raw: Credential;
  statusLoading: boolean;
  status: Record<string, FetchedStatus>;
}

const toast = useToast();
const confirm = useConfirm();

const expandedRows = ref();

const { data, loading, total, perPage, load } = setupPagination({
  fetch: async (params) => {
    const response = await http<Credential[]>("management/credentials", {
      params
    });
    const parsedCredentials: CredentialParsed[] = response.data.map((item) => {
      const subjectTypes = toArray(item.credential.credentialSubject).flatMap(
        (s) => [...toArray(s.type), ...toArray(s["@type"])]
      );
      const credentialTypes = new Set([
        ...toArray(item.credential.type),
        ...subjectTypes
      ]);
      const simpleTypes = [...credentialTypes]
        .map((type) => type.split(/[/#]/g).slice(-1)[0])
        .filter((type) => type !== "VerifiableCredential");
      const expirationDate = new Date(
        item.credential.expirationDate ?? item.credential.validUntil
      );
      const expirationSeverity =
        expirationDate < new Date()
          ? "danger"
          : expirationDate < new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
            ? "warn"
            : "secondary";
      return {
        id: item.id.replace(`${item.targetDid}#`, ""),
        targetDid: item.targetDid,
        issuer: item.selfIssued ? "self" : item.credential.issuer,
        type: simpleTypes,
        expirationDate: dayjs(
          item.credential.expirationDate ?? item.credential.validUntil
        ).fromNow(),
        expirationSeverity,
        raw: item,
        statusLoading: false,
        status: {}
      };
    });
    const parsedResponse = response as unknown as AxiosResponse<
      CredentialParsed[]
    >;
    parsedResponse.data = parsedCredentials;
    return parsedResponse;
  },
  errorContext: {
    summary: "Could not load credentials",
    defaultMessage: `Error in fetching credentials`
  }
});

const deleteCredential = async (credentialId: string) => {
  confirm.require({
    header: "Are you sure you want to delete this credential?",
    message:
      "This results in the credential not being available for usage, and might impact authentication in other processes!\nNOTE: Deleting credentials does not have an impact on the credential outside of this wallet!",
    icon: "pi pi-info-circle",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await http.delete(
          `management/credentials/${encodeURIComponent(credentialId)}`
        );
        await load();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Credential deleted",
          life: 3000
        });
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: "Could not delete credential",
            defaultMessage: `Error in deleting credential`
          })
        );
      }
    }
  });
};
const revokeCredential = async (credentialId: string) => {
  confirm.require({
    header: "Are you sure you want to revoke this credential?",
    message:
      "This results in the credential not being available for usage, and might impact authentication in other processes!",
    icon: "pi pi-info-circle",
    rejectLabel: "Cancel",
    acceptLabel: "Revoke",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await http.post(
          `management/credentials/${encodeURIComponent(credentialId)}/revoke`
        );
        await load();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Credential revoked",
          life: 3000
        });
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: "Could not revoke credential",
            defaultMessage: `Error in revoking credential`
          })
        );
      }
    }
  });
};

const copyCredentialId = (credentialId: string) => {
  navigator.clipboard.writeText(credentialId);
  toast.add({
    severity: "success",
    summary: "Copied",
    detail: "Copied Credential ID to clipboard",
    life: 3000
  });
};

const copyCredential = (credential: VerifiableCredential) => {
  navigator.clipboard.writeText(JSON.stringify(credential, null, 2));
  toast.add({
    severity: "success",
    summary: "Copied",
    detail: "Copied Credential JSON to clipboard",
    life: 3000
  });
};

const mapStatusPurpose = (
  statusPurpose: "refresh" | "revocation" | "suspension" | "message",
  status: boolean
) => {
  switch (statusPurpose) {
    case "refresh":
      return status ? "Credential needs refresh" : "Credential is fresh";
    case "revocation":
      return status ? "Credential is revoked" : "Credential is not revoked";
    case "suspension":
      return status ? "Credential is suspended" : "Credential is not suspended";
    case "message":
      return status
        ? "Credential has status message"
        : "Credential has no status message";
  }
};

const fetchStatus = async (
  credentialParsed: CredentialParsed,
  status: CredentialStatus,
  loading: boolean = false
) => {
  if (loading) {
    credentialParsed.statusLoading = true;
  }
  try {
    const response = await http.post<VerifiedCredentialStatus>(
      "management/presentation/status",
      {
        statusListCredential: status.statusListCredential,
        statusListIndex: status.statusListIndex
      }
    );
    credentialParsed.status[status.statusPurpose] = {
      ...response.data,
      message: mapStatusPurpose(status.statusPurpose, response.data.status)
    };
    if (loading) {
      credentialParsed.statusLoading = false;
    }
    return credentialParsed.status[status.statusPurpose];
  } catch (error) {
    if (loading) {
      credentialParsed.statusLoading = false;
    }
    return {
      statusListCredential: status.statusListCredential,
      statusListIndex: status.statusListIndex,
      statusPurpose: status.statusPurpose,
      message: `Could not verify status ${status.statusPurpose}: ${error.message}`,
      status: true
    };
  }
};

const verifyStatusses = async (credential: CredentialParsed) => {
  credential.statusLoading = true;
  const credentialStatus = toArray(credential.raw.credential.credentialStatus);
  const statusses = await Promise.all(
    credentialStatus.map((status) => fetchStatus(credential, status))
  );
  if (statusses.some((status) => status.status)) {
    toast.add({
      severity: "error",
      summary: "Status verification failed",
      detail: statusses.map((status) => status.message).join("\n"),
      life: 5000
    });
  } else {
    toast.add({
      severity: "success",
      summary: "Status verified",
      detail: "All statusses are verified",
      life: 5000
    });
  }

  credential.statusLoading = false;
};

onMounted(async () => {
  await load({
    page: 0,
    rows: 10,
    sortField: "createdDate",
    sortOrder: 1
  } as unknown as DataTableSortEvent);
});
</script>

<template>
  <div>
    <Card>
      <template #title>Credentials</template>
      <template #subtitle>
        <p>
          Verifiable Credentials are digital credentials that can be securely
          issued, stored, and shared online. They provide a way for individuals
          to prove aspects of their identity or qualifications without revealing
          unnecessary personal information. These credentials are
          cryptographically secure, enabling verification by others without the
          need for a trusted third party. For more details see the
          <a href="https://www.w3.org/TR/vc-data-model-2.0/" target="_blank"
            >Verifiable Credentials Data Model specification</a
          >.
        </p>
        <p>
          The table below shows all credentials that are issued and imported
          into this Wallet instance.
        </p>
      </template>
      <template #content>
        <DataTable
          v-model:expanded-rows="expandedRows"
          :value="data"
          lazy
          :loading="loading"
          paginator
          :rows-per-page-options="[5, 10, 25, 50]"
          :total-records="total"
          :first="0"
          :rows="perPage"
          data-key="id"
          sort-field="createdDate"
          :sort-order="1"
          @page="load"
          @sort="load">
          <Column expander style="width: 5rem" />
          <Column field="id" header="ID" sortable>
            <template #body="props">
              <code
                class="text-sm block whitespace-nowrap overflow-hidden text-ellipsis"
                style="width: 36ch"
                >{{
                  props.data.id.replace(`${props.data.targetDid}#`, "")
                }}</code
              >
            </template>
          </Column>
          <Column
            field="targetDid"
            header="Target (Issuer)"
            class="text-sm"
            sortable>
            <template #body="props">
              <code
                class="block whitespace-nowrap overflow-hidden text-ellipsis"
                style="max-width: 50ch"
                >{{ props.data.targetDid }}</code
              ><br />
              <small
                ><code
                  class="block whitespace-nowrap overflow-hidden text-ellipsis"
                  >({{ props.data.issuer }})</code
                ></small
              >
            </template>
          </Column>
          <Column field="type" header="Type">
            <template #body="props">
              <Tag
                v-for="type in props.data.type"
                :key="type"
                class="mr-1 mb-1"
                :value="type"
                severity="info"></Tag>
            </template>
          </Column>
          <Column
            field="createdDate"
            header="Issuance"
            style="width: 8rem; text-align: center"
            sortable>
            <template #body="props">
              <Tag
                v-if="props.data.raw.credential.issuanceDate"
                severity="secondary"
                >{{
                  formatRelative(props.data.raw.credential.issuanceDate)
                }}</Tag
              >
              <Tag v-else severity="warn">-</Tag>
            </template>
          </Column>
          <Column
            field="credential.expirationDate"
            header="Expiration"
            style="width: 8rem; text-align: center">
            <template #body="props">
              <Tag :severity="props.data.expirationSeverity">{{
                props.data.expirationDate
              }}</Tag>
            </template>
          </Column>
          <Column field="statusListIndex" header="Status">
            <template #body="props">
              <Button
                v-if="
                  toArray(props.data.raw.credential.credentialStatus).length
                "
                severity="info"
                icon="pi pi-refresh"
                :loading="props.data.statusLoading"
                @click="verifyStatusses(props.data)" />
            </template>
          </Column>
          <Column field="actions" header="Actions" style="width: 8rem">
            <template #body="props">
              <Button
                class="mr-2"
                severity="help"
                icon="pi pi-copy"
                @click="copyCredential(props.data.raw.credential)" />
              <Button
                v-if="
                  props.data.raw.selfIssued && props.data.raw.statusListIndex
                "
                severity="danger"
                icon="pi pi-times"
                :disabled="props.data.raw.revoked"
                @click="revokeCredential(props.data.raw.id)" />
            </template>
          </Column>
          <template #expansion="props">
            <Tabs class="mt-3" value="Details">
              <TabList>
                <Tab value="Details">Details</Tab>
                <Tab value="CredentialSubject">Credential Subject</Tab>
                <Tab value="Credential">Full credential</Tab>
              </TabList>
              <TabPanels>
                <TabPanel value="Details">
                  <FormField label="Credential ID">
                    <Button
                      pt:root:class="-ml-2 !py-0"
                      pt:label:class="font-mono"
                      severity="help"
                      icon="pi pi-copy"
                      icon-pos="right"
                      variant="text"
                      size="small"
                      :label="props.data.raw.id"
                      @click="copyCredentialId(props.data.raw.id)" />
                  </FormField>
                  <FormField label="Issuance date"
                    >{{
                      formatDate(props.data.raw.credential.issuanceDate)
                    }}
                    &nbsp;&nbsp;({{
                      dayjs(props.data.raw.credential.issuanceDate).fromNow()
                    }})</FormField
                  >
                  <FormField label="Expiration date"
                    >{{
                      formatDate(props.data.raw.credential.expirationDate)
                    }}
                    &nbsp;&nbsp;({{
                      dayjs(props.data.raw.credential.expirationDate).fromNow()
                    }})</FormField
                  >
                  <FormField label="Proof Type">{{
                    props.data.raw.credential.proof.type
                  }}</FormField>
                  <template v-if="props.data.raw.credential.credentialStatus">
                    <FormField
                      v-for="(status, index) in toArray(
                        props.data.raw.credential.credentialStatus
                      )"
                      :key="index"
                      :label="
                        status.statusPurpose[0].toUpperCase() +
                        status.statusPurpose.slice(1) +
                        ' status'
                      ">
                      <div>
                        <Button
                          pt:root:class="!py-0"
                          label="Fetch"
                          class="mr-3"
                          severity="info"
                          icon="pi pi-refresh"
                          size="small"
                          :loading="props.data.statusLoading"
                          @click="fetchStatus(props.data, status, true)" />
                        <a
                          class="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                          :href="status.statusListCredential"
                          target="_blank"
                          >{{ status.statusListCredential }}</a
                        >
                        at index
                        {{ status.statusListIndex }}
                      </div>
                      <div v-if="props.data.status[status.statusPurpose]">
                        <Tag
                          class="my-2"
                          :severity="
                            props.data.status[status.statusPurpose].status
                              ? 'danger'
                              : 'success'
                          "
                          >{{
                            props.data.status[status.statusPurpose].message
                          }}</Tag
                        >
                      </div>
                    </FormField>
                  </template>
                </TabPanel>
                <TabPanel value="CredentialSubject">
                  <MonacoEditorVue
                    :static="props.data.raw.credential.credentialSubject"
                    :read-only="true"
                    :min-lines="1"
                    :max-lines="100" />
                </TabPanel>
                <TabPanel value="Credential">
                  <MonacoEditorVue
                    :static="props.data.raw.credential"
                    :read-only="true"
                    :min-lines="1"
                    :max-lines="100" />
                </TabPanel>
              </TabPanels>
            </Tabs>

            <Button
              severity="danger"
              icon="pi pi-trash"
              label="Delete credential"
              variant="outlined"
              @click="deleteCredential(props.data.raw.id)" />
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
