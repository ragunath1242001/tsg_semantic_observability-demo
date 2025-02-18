<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "primevue/usetoast";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import schema from "@tsg-dsp/common-ui/assets/presentation-definition.schema.json";
import http from "@tsg-dsp/common-ui/utils/http";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import QRCode from "qrcode";

const toast = useToast();

const oid4vpUrl = ref<string>();

const visible = ref(false);

const verifierForm = ref<{
  presentationDefinition: string;
}>({
  presentationDefinition: JSON.stringify(
    {
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
    },
    null,
    2
  )
});

const oid4vpData = ref("");

const createAuthorizationRequest = async () => {
  try {
    const response = await http.post<string>(
      "management/oid4vp/verifier/create",
      JSON.parse(verifierForm.value.presentationDefinition)
    );
    if (response.status == 201) {
      oid4vpUrl.value = response.data;
      oid4vpData.value = await QRCode.toDataURL(response.data);
      visible.value = true;
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
};
</script>

<template>
  <div>
    <Card>
      <template #title>Open ID For Verifiable Presentations</template>
      <template #subtitle>
        <p>
          This page allows you to manually create an authorization request for
          the Open ID For Verifiable Presentations (OID4VP) protocol. This is
          meant to be used with the TSG mobile wallet app and serves as an
          authentication mechanism for users.
        </p>
      </template>
    </Card>
    <Card class="mt-8">
      <template #title>Create Authorization Request</template>
      <template #subtitle>
        <p>
          Create an authorization request for the OID4VP protocol by providing a
          presentation definition.
        </p>
      </template>
      <template #content>
        <form
          class="flex flex-col gap-4"
          @submit.prevent="createAuthorizationRequest">
          <FormField label="Presentation Definition">
            <MonacoEditorVue
              v-model="verifierForm.presentationDefinition"
              :schema="schema"
              :min-lines="3"
              :max-lines="30"></MonacoEditorVue>
          </FormField>
          <FormField no-label>
            <Button label="Create Authorization Request" type="submit" />
          </FormField>
        </form>
        <Dialog
          v-model:visible="visible"
          :dismissable-mask="true"
          :style="{ width: '15%', maxWidth: '100rem' }"
          modal
          @hide="visible = undefined">
          <template #header>
            <span class="p-dialog-title" data-pc-section="title">
              Authorization Request</span
            >
          </template>
          <span class="text-surface-500 dark:text-surface-400 block mb-8"
            >Scan the QR code with the TSG Mobile Wallet to authorize the
            request</span
          >
          <a :href="oid4vpUrl" target="_blank"
            ><img :src="oid4vpData" alt="QR code"
          /></a>
        </Dialog>
      </template>
    </Card>
  </div>
</template>
