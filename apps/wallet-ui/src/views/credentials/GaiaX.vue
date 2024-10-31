<script setup lang="ts">
import { CredentialSubject, toArray, VerifiableCredential } from "@tsg-dsp/common-dsp";
import { onMounted, ref } from "vue";
import { useToast } from "primevue/usetoast";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { AutoCompleteCompleteEvent } from "primevue/autocomplete";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import http from "@tsg-dsp/common-ui/utils/http";
import { useRuntimeStore } from "@/stores/runtime";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

interface LegalRegistrationNumberForm {
  type: string | undefined;
  value: string | undefined;
  targetDid: string;
  id: string;
  clearingHouse: string;
  clearingHouses: string[];
}

interface ComplianceCredentialForm {
  targetDid: string;
  id: string;
  credentials: VerifiableCredential[];
  clearingHouse: string;
  clearingHouses: string[];
}

interface Credential {
  id: string;
  targetDid: string;
  credential: VerifiableCredential;
  selfIssued: boolean;
}

interface CredentialParsed {
  id: string;
  type: string[];
  raw: Credential;
}

const toast = useToast();
const credentials = ref<CredentialParsed[]>([]);
const userStore = useUserStore();
const runtimeStore = useRuntimeStore();

const lrnClearingHouses = ["registrationnumber.notary.gaia-x.eu/v1"];
const complianceClearingHouses = [
  "compliance.gaia-x.eu/development",
  "compliance.gaia-x.eu/v1",
];
const legalRegistrationNumberDefault: LegalRegistrationNumberForm = {
  type: undefined,
  value: undefined,
  targetDid: userStore.user?.didId || "",
  id: "LRNCredential",
  clearingHouse: "registrationnumber.notary.gaia-x.eu/v1",
  clearingHouses: lrnClearingHouses,
};
const complianceCredentialDefault: ComplianceCredentialForm = {
  targetDid: userStore.user?.didId || "",
  id: "ComplianceCredential",
  credentials: [],
  clearingHouse: "compliance.gaia-x.eu/development",
  clearingHouses: complianceClearingHouses,
};
const legalRegistrationNumberForm = ref(legalRegistrationNumberDefault);
const complianceCredentialForm = ref(complianceCredentialDefault);

const loadCredentials = async () => {
  try {
    const response = await http.get<Credential[]>(
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
        type: simpleTypes,
        name: `${item.id.replace(`${item.targetDid}#`, "")} (${simpleTypes.join(
          ", "
        )})`,
        raw: item,
      };
    });
  } catch (error) {
    toast.add(toastError({
      error,
      summary: "Could not load credentials",
      defaultMessage: `Could not load credentials`
    }));
  }
};

const importLRNCredential = async () => {
  try {
    const property = `gx:${legalRegistrationNumberForm.value.type}`;
    const credential = {
      "@context": [
        "https://registry.lab.gaia-x.eu/development/api/trusted-shape-registry/v1/shapes/jsonld/participant",
      ],
      type: "gx:legalRegistrationNumber",
      id: legalRegistrationNumberForm.value.targetDid,
      [property]: legalRegistrationNumberForm.value.value,
    };
    await http.post(
      "management/credentials/gaiax/legalRegistrationNumber",
      {
        vcId: `${
          legalRegistrationNumberForm.value.targetDid
        }#${encodeURIComponent(legalRegistrationNumberForm.value.id)}`,
        clearingHouse: legalRegistrationNumberForm.value.clearingHouse,
        credentialSubject: credential,
      }
    );
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Legal Registration Number credential imported",
      life: 3000,
    });
    await loadCredentials();
  } catch (error) {
    toast.add(toastError({
      error,
      summary: "Could not import credential",
      defaultMessage: `Error in importing Legal Registration Number credential`
    }));
  }
};

const importComplianceCredential = async () => {
  try {
    await http.post("management/credentials/gaiax/compliance", {
      vcId: `${complianceCredentialForm.value.targetDid}#${encodeURIComponent(
        complianceCredentialForm.value.id
      )}`,
      clearingHouse: complianceCredentialForm.value.clearingHouse,
      credentials: complianceCredentialForm.value.credentials,
    });
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Compliance credential imported",
      life: 3000,
    });
    await loadCredentials();
  } catch (error) {
    toast.add(toastError({
      error,
      summary: "Could not import credential",
      defaultMessage: `Error in importing compliance credential`
    }));

  }
};

const searchLRNClearingHouses = async (event: AutoCompleteCompleteEvent) => {
  legalRegistrationNumberForm.value.clearingHouses = event.query
    ? lrnClearingHouses.filter((ch) => ch.includes(event.query))
    : lrnClearingHouses;
};
const searchComplianceClearingHouses = async (
  event: AutoCompleteCompleteEvent
) => {
  complianceCredentialForm.value.clearingHouses = event.query
    ? complianceClearingHouses.filter((ch) => ch.includes(event.query))
    : complianceClearingHouses;
};

onMounted(async () => {
  await loadCredentials();
});
</script>

<template>
  <div>
    <Card v-if="!runtimeStore.gaiaXSupport">
      <template #title>Gaia-X support disabled</template>
      <template #subtitle
        >Gaia-X support is disabled for this Wallet instance</template
      >
    </Card>
    <template v-else>
      <Card>
        <template #title>Gaia-X Legal Registration Number</template>
        <template #subtitle
          >Request Gaia-X legal registration number credential from a Gaia-X
          DCH</template
        >
        <template #content>
          <form class="flex flex-col gap-4" @submit.prevent="importLRNCredential">
            <FormField label="Legal registration number type" v-slot="props">
              <Select
                :id="props.id"
                v-model="legalRegistrationNumberForm.type"
                :options="['taxID', 'EUID', 'EORI', 'vatID', 'leiCode']"
                class="w-full"
              />
            </FormField>
            <FormField label="Legal registration number" v-slot="props">
              <InputText
                :id="props.id"
                class="w-full"
                v-model="legalRegistrationNumberForm.value"
                v-if="legalRegistrationNumberForm.type === 'taxID'"
                type="text"
                required
                pattern="^\d{2}-\d{7}$"
                validation-message="Provide a correct taxID (pattern: \d{2}-\d{7})"
              />
              <InputText
                :id="props.id"
                class="w-full"
                v-model="legalRegistrationNumberForm.value"
                v-else-if="legalRegistrationNumberForm.type === 'EUID'"
                type="text"
                required
                pattern="^[A-Z]{2}\d{2}[A-Z0-9]{1,15}$"
                validation-message="Provide a correct EUID (pattern: [A-Z]{2}\d{2}[A-Z0-9]{1,15})"
              />
              <InputText
                :id="props.id"
                class="w-full"
                v-model="legalRegistrationNumberForm.value"
                v-else-if="legalRegistrationNumberForm.type === 'EORI'"
                type="text"
                required
                pattern="^[A-Z]{2}[A-Z0-9]{1,15}$"
                validation-message="Provide a correct EORI (pattern: [A-Z]{2}[A-Z0-9]{1,15})"
              />
              <InputText
                :id="props.id"
                class="w-full"
                v-model="legalRegistrationNumberForm.value"
                v-else-if="legalRegistrationNumberForm.type === 'vatID'"
                type="text"
                required
                pattern="^[A-Z]{2}[A-Z0-9]{2,15}$"
                validation-message="Provide a correct vatId (pattern: [A-Z]{2}[A-Z0-9]{2,15})"
              />
              <InputText
                :id="props.id"
                class="w-full"
                v-model="legalRegistrationNumberForm.value"
                v-else-if="legalRegistrationNumberForm.type === 'leiCode'"
                type="text"
                required
                pattern="^[A-Z0-9]{20}$"
                validation-message="Provide a correct leiCode (pattern: [A-Z0-9]{20})"
              />
              <InputText
                :id="props.id"
                class="w-full"
                v-model="legalRegistrationNumberForm.value"
                v-else
                type="text"
                disabled
                required
              />
            </FormField>
            <FormField label="Target DID" v-slot="props">
              <InputText
                :id="props.id"
                class="w-full"
                v-model="legalRegistrationNumberForm.targetDid"
                placeholder="did:..."
                pattern="did:(web|tdw):.*"
                validation-message="Target DID must be a DID web"
              />
            </FormField>
            <FormField label="ID" v-slot="props">
              <InputText
                :id="props.id"
                class="w-full"
                v-model="legalRegistrationNumberForm.id"
                placeholder="ID"
                required
              />
            </FormField>
            <FormField label="Composite ID" v-slot="props">
              <InputText
                :id="props.id"
                class="w-full"
                :value="`${
                  legalRegistrationNumberForm.targetDid
                }#${encodeURIComponent(legalRegistrationNumberForm.id)}`"
                disabled
              />
            </FormField>
            <FormField label="Clearing house" v-slot="props">
              <AutoComplete
                :id="props.id"
                class="w-full"
                v-model="legalRegistrationNumberForm.clearingHouse"
                dropdown
                :suggestions="legalRegistrationNumberForm.clearingHouses"
                @complete="searchLRNClearingHouses"
                @dropdown-click="searchLRNClearingHouses"
                placeholder="ID"
                required
              />
            </FormField>
            <FormField no-label class="mt-8">
              <Button
                label="Request and import Legal Registration Number credential"
                type="submit"
              />
            </FormField>
          </form>
        </template>
      </Card>
      <Card class="mt-8">
        <template #title>Gaia-X Compliance</template>
        <template #subtitle
          >Request Gaia-X compliance credential from a Gaia-X DCH</template
        >
        <template #content>
          <form class="flex flex-col gap-4" @submit.prevent="importComplianceCredential">
            <FormField label="Credentials" v-slot="props">
              <MultiSelect
                v-model="complianceCredentialForm.credentials"
                :options="credentials"
                optionLabel="name"
                optionValue="raw"
                placeholder="Select credentials"
                class="w-full"
              />
            </FormField>
            <FormField label="Target DID" v-slot="props">
              <InputText
                :id="props.id"
                class="w-full"
                v-model="complianceCredentialForm.targetDid"
                placeholder="did:..."
                pattern="did:(web|tdw):.*"
                validation-message="Target DID must be a DID web"
              />
            </FormField>
            <FormField label="ID" v-slot="props">
              <InputText
                :id="props.id"
                class="w-full"
                v-model="complianceCredentialForm.id"
                placeholder="ID"
                required
              />
            </FormField>
            <FormField label="Composite ID" v-slot="props">
              <InputText
                :id="props.id"
                class="w-full"
                :value="`${
                  complianceCredentialForm.targetDid
                }#${encodeURIComponent(complianceCredentialForm.id)}`"
                disabled
              />
            </FormField>
            <FormField label="Clearing house" v-slot="props">
              <AutoComplete
                :id="props.id"
                class="w-full"
                v-model="complianceCredentialForm.clearingHouse"
                dropdown
                :suggestions="complianceCredentialForm.clearingHouses"
                @complete="searchComplianceClearingHouses"
                @dropdown-click="searchComplianceClearingHouses"
                placeholder="ID"
                required
              />
            </FormField>
            <FormField no-label class="mt-8">
              <Button
                label="Request and import Compliance credential"
                type="submit"
              />
            </FormField>
          </form>
        </template>
      </Card>
    </template>
  </div>
</template>

<style scoped></style>
