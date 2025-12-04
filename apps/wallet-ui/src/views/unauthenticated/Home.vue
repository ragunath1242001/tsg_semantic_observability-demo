<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import {
  CredentialConfig,
  CredentialOffer,
  CredentialOfferRequest,
  StatusDto
} from "@tsg-dsp/wallet-dtos";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

import CredentialOverview from "@/components/CredentialOverview.vue";
import WalletStatus from "@/components/WalletStatus.vue";

const toast = useToast();

const status = ref<StatusDto>();

const showDialog = ref(false);

const email = ref("");
const credentialType = ref({ credentialType: "" });

const loadStatus = async () => {
  try {
    const response = await http.get<StatusDto>("status");
    status.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to get status",
        defaultMessage: `Could not load status`
      })
    );
  }
};

const createCredentialOffer = async () => {
  if (!email.value) {
    toast.add({
      severity: "error",
      summary: "Email required",
      detail: "Please enter an email address",
      life: 3000
    });
    return;
  } else if (!credentialType.value.credentialType) {
    toast.add({
      severity: "error",
      summary: "Credential type required",
      detail: "Please select a credential type",
      life: 3000
    });
    return;
  }
  try {
    const credentialSubject = {
      id: crypto.randomUUID(),
      email: email.value,
      emailDomain: email.value.split("@")[1]
    };
    console.log(credentialSubject);
    const offerRequest: CredentialOfferRequest = {
      credentialType: credentialType.value.credentialType,
      credentialSubject: credentialSubject,
      preAuthorizedCode: crypto.getRandomValues(new Uint8Array(16)).join("")
    };

    const response = await http.post<CredentialOffer>(
      "management/issuance/offers/public?mobile=false",
      offerRequest
    );
    if (response.status === 200) {
      toast.add({
        severity: "success",
        summary: "Offer created",
        detail: `Credential offer successfully created, check your email`,
        life: 3000
      });
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not send email",
        defaultMessage: `Error in sending email`
      })
    );
  }
};

const credentialTypes = computed(() => config.value?.issueConfigurations ?? []);

const config = ref<CredentialConfig>();

const loadConfig = async () => {
  try {
    const response = await http<CredentialConfig>(
      "management/credentials/config"
    );
    config.value = response.data;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not load credential config",
        defaultMessage: `Error in fetching credential config`
      })
    );
  }
};

onMounted(async () => {
  await loadStatus();
  await loadConfig();
});
</script>
<template>
  <Card>
    <template #title>Wallet Home</template>
    <template #content
      ><p>
        Welcome to the homepage of the Wallet. On this page you can find an
        overview of the issued credentials and there is an option to request
        your own credential as well.
      </p>

      <p>
        In case you are looking for a credential for the
        <b>TSG Wallet mobile app</b>, proceed
        <RouterLink class="text-primary" to="/retrieve-credential"
          >here</RouterLink
        >.
      </p>
    </template>
  </Card>
  <div class="grid grid-cols-12 gap-4 mt-8">
    <WalletStatus v-if="status" :status="status" />
  </div>
  <Dialog
    v-model:visible="showDialog"
    modal
    header="Request a new Credential"
    width="30rem"
    @hide="showDialog = false">
    <div class="flex flex-col gap-4 mb-4">
      <FormField label="Credential Type">
        <Select
          v-model="credentialType"
          class="w-full"
          :options="credentialTypes"
          required
          option-label="credentialType"
          value-label="credentialType"
          placeholder="Credential type" />
      </FormField>
      <FormField label="Email">
        <InputText v-model="email" class="w-full" type="email" required />
      </FormField>
      <FormField no-label class="mt-4"> </FormField>
    </div>
    <div class="flex justify-end gap-2">
      <form @submit.prevent="createCredentialOffer">
        <Button label="Send Email" severity="success" type="submit" />
      </form>
    </div>
  </Dialog>
  <Card class="mt-8">
    <template #title>Request new credential</template>
    <template #subtitle>
      You can request a new credential by clicking the button below. This will
      open a dialog where you can select the type of credential you want to
      request.
    </template>
    <template #content>
      <Button
        label="Request Credential"
        class="mt-4"
        @click="showDialog = true" />
    </template>
  </Card>
  <CredentialOverview class="mt-8" :authenticated="false" />
</template>
