<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";

const toast = useToast();

const credentialRef = ref<string>("{}");
const credentialValidation = ref<string>();

const validateCredential = (showToast: boolean) => {
  const didMethods: string[] = ["did:web:", "did:tdw:"];
  try {
    let credential;
    try {
      credential = JSON.parse(credentialRef.value);
    } catch (err) {
      throw Error("Credential subject must be a valid JSON document");
    }
    if (typeof credential !== "object") {
      throw Error("Credential subject must be a valid JSON object");
    }
    if (!credential["id"] || typeof credential["id"] !== "string") {
      throw Error("Credential id must be present and be a string");
    }
    if (
      !credential["issuer"] ||
      typeof credential["issuer"] !== "string" ||
      !didMethods.some((method) => credential["issuer"].startsWith(method))
    ) {
      throw Error(
        `Credential issuer must be present and be a string and start with one of the following: ${didMethods}`
      );
    }
    if (
      !credential["credentialSubject"] ||
      typeof credential["credentialSubject"] !== "object" ||
      !credential["credentialSubject"]["id"] ||
      typeof credential["credentialSubject"]["id"] !== "string" ||
      !didMethods.some((method) =>
        credential["credentialSubject"]["id"].startsWith(method)
      )
    ) {
      throw Error(
        `Credential subject must be present and be an object containing at least an id starting with one of the following ${didMethods}`
      );
    }

    if (!showToast) {
      credentialValidation.value = undefined;
    }
    return credential;
  } catch (e) {
    const errorMessage = (e as Error).message;
    if (showToast) {
      toast.add({
        severity: "warn",
        summary: "Validation error",
        detail: errorMessage,
        life: 10000,
      });
    } else {
      credentialValidation.value = errorMessage;
    }
    return null;
  }
};

const importCredential = async (validate = true) => {
  let credential;
  if (validate) {
    credential = validateCredential(true);
    if (!credential) return;
  } else {
    credential = JSON.parse(credentialRef.value);
  }

  try {
    await http.post("management/credentials/import", credential);
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Credential imported",
      life: 3000,
    });
    credentialRef.value = "{}";
    credentialValidation.value = undefined;
  } catch (error) {
    toast.add(toastError({
      error,
      summary: "Could not import credential",
      defaultMessage: `Error in importing credential`
    }));
  }
};
</script>

<template>
  <div>
    <Card>
      <template #title>Import credential</template>
      <template #subtitle>
        <p>
          The form below can be used to import Verifiable Credentials that are
          issued and shared in an out-of-band fashion.
        </p>
        <p>
          The contents of the form should match the specification in the
          <a href="https://www.w3.org/TR/vc-data-model-2.0/"
            >Verifiable Credentials Data Model v2.0</a
          >.
        </p>
      </template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="importCredential(true)">
          <FormField label="Credential" v-slot="props">
            <MonacoEditorVue v-model="credentialRef"></MonacoEditorVue>
            <small class="text-yellow-400" v-if="credentialValidation">{{
              credentialValidation
            }}</small>
          </FormField>
          <FormField no-label class="mt-8">
            <Button label="Import credential" type="submit" />
            <Button
              class="ml-4"
              severity="warn"
              label="Import credential without verification"
              @click="importCredential(false)"
            />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped></style>
