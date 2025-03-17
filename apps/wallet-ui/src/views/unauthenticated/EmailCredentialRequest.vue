<script setup lang="ts">
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { CredentialOfferStatus } from "@tsg-dsp/wallet-dtos";
import { useToast } from "primevue";
import QRCode from "qrcode";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

const issuerUrl = ref(window.location.origin);

const route = useRoute();
const toast = useToast();

const preAuthorizedCode = ref("");

const credentialOfferUrl = ref("");
const credentialOfferQr = ref("");

const mobile = route.query.mobile === "true";

const getOfferById = async (id: string) => {
  try {
    const response = await http.get<CredentialOfferStatus>(
      `management/issuance/offers/${id}`
    );
    preAuthorizedCode.value = response.data.preAuthorizedCode;
    const credentialOffer = {
      credential_issuer: issuerUrl.value,
      credential_configuration_ids: [response.data.credentialType],
      grants: {
        "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
          "pre-authorized_code": response.data.preAuthorizedCode
        }
      }
    };
    const url = `openid-credential-offer://?credential_offer=${encodeURIComponent(JSON.stringify(credentialOffer))}`;
    credentialOfferUrl.value = url;
    credentialOfferQr.value = await QRCode.toDataURL(url);
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not retrieve offer",
        defaultMessage: `Error in retrieving offer`
      })
    );
  }
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(preAuthorizedCode.value);
  toast.add({
    severity: "success",
    summary: "Copied to clipboard",
    detail: "Pre-authorized code copied to clipboard",
    life: 3000
  });
};

onMounted(async () => {
  const id = Array.isArray(route.params.id)
    ? route.params.id[0]
    : route.params.id;
  await getOfferById(id);
});
</script>
<template>
  <div class="p-4">
    <Card class="credential-card shadow-lg">
      <template #header>
        <div
          class="bg-primary p-4 text-white flex justify-between items-center rounded-t-lg">
          <div class="flex flex-col">
            <h2 class="text-2xl text-white font-bold mb-1">
              Credential Ready!
            </h2>
            <p class="text-sm opacity-90">
              Secure your digital identity in seconds
            </p>
          </div>
          <i class="pi pi-id-card text-4xl"></i>
        </div>
      </template>

      <template #content>
        <div v-if="mobile" class="flex flex-col items-center">
          <div class="mb-4 text-center">
            <p class="mb-2">Scan the QR code with your wallet app to proceed</p>
            <div class="qr-container p-3 bg-surface-50 rounded-lg inline-block">
              <a
                :href="credentialOfferUrl"
                class="block hover:opacity-90 transition-opacity"
                target="_blank">
                <img
                  :src="credentialOfferQr"
                  class="rounded-md shadow-sm"
                  alt="QR Code" />
              </a>
            </div>
          </div>
        </div>

        <div v-else class="flex flex-col">
          <div
            class="credential-code-container text-surface-700 bg-surface-100 rounded-lg p-4 mb-4">
            <h3
              class="text-lg text-surface-700 font-medium mb-3 flex items-center">
              <i class="pi pi-key mr-2 text-primary"></i>
              Your Pre-authorized Code
            </h3>

            <div
              class="code-display flex items-stretch rounded overflow-hidden shadow-sm">
              <code
                class="bg-surface-200 text-lg px-5 py-3 flex-grow overflow-x-auto">
                {{ preAuthorizedCode }}
              </code>
              <Button
                v-tooltip.bottom="'Copy to clipboard'"
                icon="pi pi-copy"
                class="copy-btn p-button-raised"
                @click="copyToClipboard" />
            </div>

            <p class="mt-3 text-sm text-surface-700">
              <i class="pi pi-info-circle mr-1"></i>
              Enter this code in your TSG Wallet app to claim your credential
            </p>
          </div>

          <div
            class="instructions text-surface-700 bg-surface-50 p-4 rounded-lg border-l-4 border-primary">
            <h3 class="text-md text-surface-700 font-medium mb-2">
              How to claim your credential:
            </h3>
            <ol class="list-decimal ml-5 space-y-1">
              <li>Open your TSG Wallet application</li>
              <li>Navigate to "OpenID 4 VCI"</li>
              <li>Select "Pre-authorized Code Flow"</li>
              <li>Enter the URL of this wallet as the issuer</li>
              <li>
                Paste the code above in the Pre-authorized code field and submit
              </li>
            </ol>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-between items-center">
          <small class="text-surface-600">Valid for 30 minutes</small>
          <a
            href="https://tsg.dataspac.es"
            target="_blank"
            rel="noopener noreferrer"
            ><Button
              label="Need help?"
              icon="pi pi-question-circle"
              class="p-button-text p-button-sm"
          /></a>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.credential-card {
  max-width: 600px;
  margin: 0 auto;
}

.code-display {
  font-family: monospace;
}

.copy-btn:hover {
  background-color: var(--primary-600);
}

.qr-container img {
  max-width: 250px;
  height: auto;
}
</style>
