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

const email = ref("");
const sent = ref(false);
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
      "oid4vci/offer",
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

const credentialTypes = computed(
  () => config.value?.contexts?.filter((c) => c.issuable) ?? []
);
const terms = ref(false);
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
  await loadConfig();
});
</script>
<template>
  <div>
    <Card v-if="!sent">
      <template #title>Retrieve Credential</template>
      <template #subtitle>
        <p>
          To retrieve a credential for the TSG Wallet app, fill in the form to
          proceed.
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
