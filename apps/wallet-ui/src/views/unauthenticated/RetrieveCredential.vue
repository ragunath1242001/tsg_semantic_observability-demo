<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import {
  CredentialConfig,
  CredentialOffer,
  CredentialOfferRequest
} from "@tsg-dsp/wallet-dtos";
import { useToast } from "primevue";
import { computed, onMounted, ref } from "vue";

import QRCodeComponent from "@/components/QRCodeComponent.vue";

const email = ref("");
const sent = ref(false);
const config = ref<CredentialConfig>();
const credentialTypes = computed(() => config.value?.issueConfigurations ?? []);
const credentialType = ref(undefined);
const toast = useToast();

async function createCredentialOffer() {
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
      "management/issuance/offers/public",
      offerRequest
    );
    if (response.status === 200) {
      toast.add({
        severity: "success",
        summary: "Offer created",
        detail: `Credential offer successfully created`,
        life: 3000
      });
      sent.value = true;
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
}

const terms = ref(false);

const loadConfig = async () => {
  try {
    const response = await http<CredentialConfig>(
      "management/credentials/config"
    );
    config.value = response.data;

    const availableTypes = config.value?.issueConfigurations ?? [];
    if (availableTypes.length > 0) {
      credentialType.value = availableTypes[0];
    }
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
  await loadConfig();
});
</script>
<template>
  <div>
    <div v-if="!sent">
      <div class="md:flex gap-6 items-start items-stretch">
        <Card>
          <template #title>Retrieve Credential</template>
          <template #subtitle>
            <p>
              To retrieve a credential for the TSG Wallet app, fill in the form
              to proceed.
            </p>
          </template>
          <template #content>
            <form
              class="flex flex-col gap-4"
              @submit.prevent="createCredentialOffer">
              <FormField label="Credential Type">
                <Select
                  v-model="credentialType"
                  class="w-full"
                  :options="credentialTypes"
                  option-label="credentialType"
                  value-label="credentialType"
                  placeholder="Credential type" />
              </FormField>
              <FormField label="Email">
                <InputText v-model="email" class="w-full" type="email" />
              </FormField>
              <FormField label="I agree to the terms and conditions">
                <Checkbox v-model="terms" binary />
              </FormField>
              <FormField no-label class="mt-4">
                <Button label="Send Email" severity="success" type="submit" />
              </FormField>
            </form>
          </template>
        </Card>
        <Card class="max-w-sm mt-6 md:mt-0 bg-blue-50 border border-blue-200">
          <template #title>
            <div class="flex items-center gap-2 text-primary">
              <i class="pi pi-info-circle text-4xl"></i>
              <span class="text-lg font-semibold"
                >Why do I need this credential?</span
              >
            </div>
          </template>
          <template #content>
            <div class="leading-relaxed">
              <p class="mb-3">
                A credential can be used to authenticate yourself in the
                dataspace. You can use it to access services, prove your
                identity, and interact with components in the dataspace.
              </p>
              <p class="mb-3">
                The TSG Wallet app allows you to manage your credentials
                securely and conveniently on your mobile device.
              </p>
              <p>
                Use your credential to present the validation of your identity
                and use it to log in to the data space services.
              </p>
            </div>
          </template>
        </Card>
      </div>
      <QRCodeComponent />
    </div>
    <Card v-else>
      <template #title>Success</template>
      <template #subtitle>
        <p>
          The credential offer has been successfully created and sent to your
          email address. Check your email to proceed.
        </p>
      </template>
    </Card>
  </div>
</template>
