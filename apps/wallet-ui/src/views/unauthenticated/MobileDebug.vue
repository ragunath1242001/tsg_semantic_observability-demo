<script setup lang="ts">
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import {
  CredentialConfig,
  CredentialOffer,
  CredentialOfferRequest
} from "@tsg-dsp/wallet-dtos";
import { useToast } from "primevue";
import { toDataURL } from "qrcode";
import { ref } from "vue";

import { useRuntimeStore } from "@/stores/runtime";

const runtimeStore = useRuntimeStore();

if (runtimeStore.issueDebugCredentials !== true) {
  throw new Error(
    "Debug credentials are not enabled in the runtime configuration."
  );
}

const toast = useToast();

const credentialOfferQr = ref("");
const credentialPresentationQr = ref("");

async function createCredentialOffer() {
  try {
    const configResponse = await http<CredentialConfig>(
      "management/credentials/config"
    );
    const context = configResponse.data.contexts.find((c) => c.issuable);
    if (!context) {
      throw new Error("No issuable credential type found in configuration.");
    }
    const credentialSubject = {
      id: crypto.randomUUID(),
      email: "credential-debug@dataspac.es",
      emailDomain: "dataspac.es",
      debug: true
    };
    console.log(credentialSubject);
    const offerRequest: CredentialOfferRequest = {
      credentialType: context.credentialType,
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
        detail: `Credential offer successfully created, scan the QR code to retrieve your credential`,
        life: 3000
      });
      const url = `openid-credential-offer://?credential_offer=${encodeURIComponent(JSON.stringify(response.data))}`;
      credentialOfferQr.value = await toDataURL(url);
    }
  } catch (error) {
    console.error("Error creating credential offer:", error);
    toast.add(
      toastError({
        error,
        summary: "Could not create offer",
        defaultMessage: `Error in creating credential offer`
      })
    );
  }
}

async function createCredentialPresentation() {
  try {
    const presentationDefinition = {
      id: crypto.randomUUID(),
      input_descriptors: [
        {
          id: crypto.randomUUID(),
          constraints: {
            fields: [
              {
                path: ["$.type"],
                filter: {
                  type: "string",
                  pattern: "VerifiableCredential"
                }
              }
            ]
          }
        }
      ]
    };
    const response = await http.post<string>(
      "management/oid4vp/verifier/create/public",
      presentationDefinition
    );
    if (response.status == 201) {
      toast.add({
        severity: "success",
        summary: "Presentation request created",
        detail: `Presentation request created, scan the QR code to present your credential`,
        life: 3000
      });
      credentialPresentationQr.value = await toDataURL(response.data);
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not create authorization request",
        defaultMessage: `Error in creating authorization request`
      })
    );
  }
}
</script>
<template>
  <div>
    <Card>
      <template #title>Generate offer</template>
      <template #subtitle>
        <p>
          To generate a test credential, click on the button below to generate
          an OpenID credential offer QR-code.
        </p>
      </template>
      <template #content>
        <Button
          label="Generate credential offer"
          severity="success"
          @click="createCredentialOffer" />
        <div v-if="credentialOfferQr" class="mt-6">
          <p>
            The credential offer has been successfully created. Scan the QR-code
            below with the app. Or click again on the button to generate a new
            one.
          </p>
          <img
            :src="credentialOfferQr"
            alt="Credential Offer QR Code"
            class="w-full max-w-sm h-auto mt-3" />
        </div>
      </template>
    </Card>
    <Card class="mt-4">
      <template #title>Present credential</template>
      <template #subtitle>
        <p>
          To generate a test presentation request, click on the button below to
          generate an OpenID credential presentation QR-code.
        </p>
      </template>
      <template #content>
        <Button
          label="Generate credential presentation"
          severity="success"
          @click="createCredentialPresentation" />
        <div v-if="credentialPresentationQr" class="mt-6">
          <p>
            The credential Presentation has been successfully created. Scan the
            QR-code below with the app. Or click again on the button to generate
            a new one.
          </p>
          <img
            :src="credentialPresentationQr"
            alt="Credential Offer QR Code"
            class="w-full max-w-sm h-auto mt-3" />
        </div>
      </template>
    </Card>
  </div>
</template>
