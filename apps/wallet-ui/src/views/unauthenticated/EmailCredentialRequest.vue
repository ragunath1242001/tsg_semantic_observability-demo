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
  <div class="min-h-screen py-8 px-4">
    <!-- Header Section -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-3">
        Your Credential is Ready!
      </h1>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto">
        Follow the instructions below to securely claim your digital credential
      </p>
    </div>

    <Card
      class="credential-card shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
      <template #header>
        <div
          class="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-4">
              <div
                class="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full">
                <svg
                  class="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                </svg>
              </div>
              <div>
                <h2 class="text-3xl text-green-50 font-bold mb-1">
                  Credential Verified
                </h2>
                <p class="text-green-100 text-lg">
                  Your digital identity is secured and ready to use
                </p>
              </div>
            </div>
            <div class="hidden md:flex items-center">
              <svg
                class="w-12 h-12 text-white/80"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
              </svg>
            </div>
          </div>
        </div>
      </template>

      <template #content>
        <div class="p-6">
          <!-- Mobile QR Code Section -->
          <div v-if="mobile" class="flex flex-col items-center">
            <div class="text-center mb-6">
              <h3 class="text-xl font-semibold text-gray-800 mb-3">
                Scan with Your Wallet App
              </h3>
              <p class="text-gray-600 mb-4">
                Use your TSG Wallet app to scan this QR code and instantly claim
                your credential
              </p>

              <div
                class="qr-container bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl shadow-lg border border-gray-200 inline-block">
                <a
                  :href="credentialOfferUrl"
                  class="block hover:scale-105 transition-transform duration-200"
                  target="_blank">
                  <img
                    :src="credentialOfferQr"
                    class="rounded-xl shadow-md"
                    alt="QR Code for Credential Offer" />
                </a>
              </div>

              <div
                class="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                Secure credential transfer
              </div>
            </div>
          </div>

          <!-- Desktop Code Section -->
          <div v-else class="space-y-6">
            <!-- Pre-authorized Code Section -->
            <div
              class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                  <svg
                    class="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-xl font-semibold text-gray-800">
                    Your Pre-authorized Code
                  </h3>
                  <p class="text-sm text-gray-600">
                    Use this secure code to claim your credential
                  </p>
                </div>
              </div>

              <div
                class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="flex items-stretch">
                  <code
                    class="bg-gray-50 text-lg px-6 py-4 flex-grow font-mono text-gray-800 overflow-x-auto">
                    {{ preAuthorizedCode }}
                  </code>
                  <Button
                    v-tooltip.left="'Copy to clipboard'"
                    icon="pi pi-copy"
                    class="bg-blue-600 hover:bg-blue-700 text-white border-0 px-4 transition-colors duration-200"
                    @click="copyToClipboard" />
                </div>
              </div>

              <div class="mt-4 flex items-start gap-2 text-sm text-blue-700">
                <svg
                  class="w-4 h-4 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span
                  >Copy this code and paste it in your TSG Wallet app to
                  securely claim your credential</span
                >
              </div>
            </div>

            <!-- Instructions Section -->
            <div
              class="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200">
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="inline-flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                  <svg
                    class="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-xl font-semibold text-gray-800">
                    How to Claim Your Credential
                  </h3>
                  <p class="text-sm text-gray-600">
                    Follow these simple steps in your TSG Wallet app
                  </p>
                </div>
              </div>

              <ol class="space-y-3">
                <li class="flex items-start gap-3">
                  <span
                    class="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-sm font-semibold rounded-full flex-shrink-0"
                    >1</span
                  >
                  <span class="text-gray-700"
                    >Open your <strong>TSG Wallet</strong> application on your
                    mobile device</span
                  >
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-sm font-semibold rounded-full flex-shrink-0"
                    >2</span
                  >
                  <span class="text-gray-700"
                    >Navigate to <strong>"OpenID 4 VCI"</strong> section</span
                  >
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-sm font-semibold rounded-full flex-shrink-0"
                    >3</span
                  >
                  <span class="text-gray-700"
                    >Select
                    <strong>"Pre-authorized Code Flow"</strong> option</span
                  >
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-sm font-semibold rounded-full flex-shrink-0"
                    >4</span
                  >
                  <span class="text-gray-700"
                    >Enter the <strong>URL of this wallet</strong> as the
                    issuer</span
                  >
                </li>
                <li class="flex items-start gap-3">
                  <span
                    class="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-sm font-semibold rounded-full flex-shrink-0"
                    >5</span
                  >
                  <span class="text-gray-700"
                    >Paste the <strong>pre-authorized code</strong> above and
                    submit</span
                  >
                </li>
              </ol>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.credential-card {
  max-width: 800px;
  margin: 0 auto;
}

.qr-container img {
  max-width: 280px;
  height: auto;
}

/* Ensure proper code display */
code {
  font-family:
    "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro",
    monospace;
  letter-spacing: 0.025em;
}

/* Custom scrollbar for code sections */
.overflow-x-auto::-webkit-scrollbar {
  height: 4px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Animation for success state */
@keyframes pulse-success {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.credential-card {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .qr-container img {
    max-width: 240px;
  }
}
</style>
