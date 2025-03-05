<script setup lang="ts">
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { CredentialOfferStatus } from "@tsg-dsp/wallet-dtos";
import { useToast } from "primevue";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import QRCode from "qrcode";

const issuerUrl = ref(window.location.origin);

const route = useRoute();
const toast = useToast();

const credentialOfferUrl = ref("");
const credentialOfferQr = ref("");

const getOfferById = async (id: string) => {
  try {
    const response = await http.get<CredentialOfferStatus>(
      `oid4vci/offer/${id}`
    );
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

onMounted(async () => {
  const id = Array.isArray(route.params.id)
    ? route.params.id[0]
    : route.params.id;
  await getOfferById(id);
});
</script>
<template>
  <div>
    <Card>
      <template #title>Retrieve Credential</template>
      <template #subtitle>
        <p>
          Retrieve your credential by scanning the QR code below with your TSG
          Wallet App.
        </p>
      </template>
      <template #content>
        <a :href="credentialOfferUrl" target="_blank"
          ><img :src="credentialOfferQr"
        /></a>
      </template>
    </Card>
  </div>
</template>
