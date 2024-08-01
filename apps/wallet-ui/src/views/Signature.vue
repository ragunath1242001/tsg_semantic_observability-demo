<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { axiosInstance } from "../store/index.js";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";

const toast = useToast();

const signRef = ref<string>("{}");
const validateType = ref<"Combined" | "Separate">("Combined");
const validateRef = ref<string>("{}");
const validateDocRef = ref<string>("{}");
const signedDocumentRef = ref();
const signedDocumentErrorRef = ref();

const isUploading = ref(false);
const isSinging = ref(false);
const isValidating = ref(false);


const signDocument = async () => {
  isSinging.value = true;
  signedDocumentRef.value = undefined;
  signedDocumentErrorRef.value = undefined;
  try {
    const request = {
      type: "JsonWebSignature",
      plainDocument: JSON.parse(signRef.value)
    }
    const response = await axiosInstance.post("management/signature/sign", request);
    signedDocumentRef.value = response.data;
  } catch (err) {
    console.log(err);
    if (err.response?.data) {
      signedDocumentErrorRef.value = err.response?.data;
    } else {
      signedDocumentErrorRef.value = {
        type: "error",
        error: `${err}`
      };
    }
    toast.add({
      severity: "warn",
      summary: "Signature error",
      detail: err.response?.data?.message ||
      "Could not sign document",
      life: 10000,
    });
  }
  isSinging.value = false;
};

const validateDocument = async () => {
  isValidating.value = true;
  try {
    let combinedValidateDocument;
    if (validateType.value === "Combined") {
      combinedValidateDocument = JSON.parse(validateRef.value);
    } else {
      const validate = JSON.parse(validateRef.value);
      const doc = JSON.parse(validateDocRef.value);
      combinedValidateDocument = {
        ...doc,
        proof: validate
      }
    }
    await axiosInstance.post("management/signature/validate", {
      type: "JsonWebSignature",
      jsonWebSignature: combinedValidateDocument
    });
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Successfully validated proof",
      life: 10000,
    });
  } catch (err) {
    toast.add({
      severity: "warn",
      summary: "Validation error",
      detail: err.response?.data?.message ||
      "Could not validate document",
      life: 10000,
    });
  }
  isValidating.value = false;
}

const onUpload = (event) => {
  isUploading.value = true;
  const file = event.files[0];
  console.log(file);
  const reader = new FileReader();
  reader.onload = () => {
    crypto.subtle.digest("SHA-256", reader.result as ArrayBuffer).then((hashBuffer) => {
      const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      signRef.value = JSON.stringify({
        "@context": {
          tsg: "https://tno-tsg.gitlab.io/#"
        },
        "tsg:digest": hashHex,
        "tsg:fileName": file.name,
        "tsg:type": file.type
      }, null, 2);
      isUploading.value = false;
    })
  }
  reader.readAsArrayBuffer(file);
}
</script>

<template>
  <div>
    <Card>
      <template #title>Sign document</template>
      <template #subtitle>
        <p>
          The form below can be used to sign JSON-LD documents. A JsonWebSignature2020 proof is created with the default key of the wallet.
        </p>
        <p>
          To sign the digest of a file, choose a file below. The file will be processesd locally within your browser to calculate the digest. A sample JSON-LD document is generated which can be signed.
        </p>
        <p>
          The contents of the form should match the specification in the
          <a href="https://www.w3.org/community/reports/credentials/CG-FINAL-lds-jws2020-20220721/"
            >JSON Web Signature 2020</a
          >.
        </p>
      </template>
      <template #content>
        <form @submit.prevent="signDocument">
          <FormField label="Sign binary document">
            <FileUpload mode="basic" auto name="signature" customUpload @uploader="onUpload" :disabled="isUploading" />
          </FormField>
          <FormField label="Plain document" v-slot="props">
            <MonacoEditorVue v-model="signRef"></MonacoEditorVue>
          </FormField>

          <FormField label="Signed document" v-if="signedDocumentRef">
            <MonacoEditorVue
                :static="signedDocumentRef"
                :read-only="true"
                :max-lines="35"
                />
          </FormField>
          <FormField label="Error" v-if="signedDocumentErrorRef">
            <MonacoEditorVue
                :static="signedDocumentErrorRef"
                :read-only="true"
                :max-lines="35"
                />
          </FormField>
          <FormField no-label class="mt-5">
            <Button label="Sign document" type="submit" :disabled="isSinging" />
          </FormField>
        </form>
      </template>
    </Card>
    <Card class="mt-5">
      <template #title>Validate document</template>
      <template #subtitle>
        <p>
          The form below can be used to validate JsonWebSignature2020 documents.
        </p>
        <p>
          The contents of the form should match the specification in the
          <a href="https://www.w3.org/community/reports/credentials/CG-FINAL-lds-jws2020-20220721/"
            >JSON Web Signature 2020</a
          >.
        </p>
      </template>
      <template #content>
        <form @submit.prevent="validateDocument">
          <FormField>
            <SelectButton v-model="validateType" :options="['Combined', 'Separate']"></SelectButton>
          </FormField>
          <FormField v-if="validateType === 'Combined'" label="Combined document">
            <MonacoEditorVue v-model="validateRef"></MonacoEditorVue>
          </FormField>
          <FormField v-if="validateType === 'Separate'" label="Plain document" v-slot="props">
            <MonacoEditorVue v-model="validateDocRef"></MonacoEditorVue>
          </FormField>
          <FormField v-if="validateType === 'Separate'" label="Proof" v-slot="props">
            <MonacoEditorVue v-model="validateRef"></MonacoEditorVue>
          </FormField>
          <FormField no-label class="mt-5">
            <Button label="Validate document" type="submit" :disabled="isValidating" />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped></style>
