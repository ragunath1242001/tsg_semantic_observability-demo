<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { formatRelative } from "@tsg-dsp/common-ui/utils/date";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import { setupPagination } from "@tsg-dsp/common-ui/utils/pagination";
import { KeyInfo } from "@tsg-dsp/wallet-dtos";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";

interface KeyForm {
  type: "EdDSA" | "ES384" | "X509";
  id: string;
  default: boolean;
  existingKey?: string;
  existingCertificate?: string;
}

const toast = useToast();
const confirm = useConfirm();

const rawDialog = ref(false);
const keyForm = ref<KeyForm>({
  type: "EdDSA",
  id: "key-",
  default: false
});
const keyTypes = ref([
  {
    value: "EdDSA",
    label: "EdDSA (Edwards-curve DSA)"
  },
  {
    value: "ES384",
    label: "ES384 (P-384 curve DSA)"
  },
  {
    value: "X509",
    label: "RSA (X.509)"
  }
]);

const { data, loading, total, perPage, load } = setupPagination({
  fetch: async (params) => {
    return http<KeyInfo[]>("management/keys", { params });
  },
  errorContext: {
    summary: "Could not load keys",
    defaultMessage: `Error in fetching key configurations`
  },
  toast
});

const setDefaultKey = async (keyId: string) => {
  try {
    await http.put(`management/keys/${encodeURIComponent(keyId)}/default`);
    await load();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Default key updated",
      life: 3000
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not update default key",
        defaultMessage: `Error in updating default key configuration`
      })
    );
  }
};

const deleteKey = async (keyId: string) => {
  confirm.require({
    header: "Are you sure you want to delete this key?",
    message:
      "Existing credentials signed with this key cannotbe used for verifiable presentations anymore!",
    icon: "pi pi-info-circle",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    rejectClass: "p-button-secondary p-button-outlined",
    acceptClass: "p-button-danger",
    accept: async () => {
      try {
        await http.delete(`management/keys/${encodeURIComponent(keyId)}`);
        await load();
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Key deleted",
          life: 3000
        });
      } catch (error) {
        toast.add(
          toastError({
            error,
            summary: "Could not delete key",
            defaultMessage: `Error in deleting key configuration`
          })
        );
      }
    }
  });
};

const addKey = async () => {
  try {
    await http.post("management/keys", keyForm.value);
    await load();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Key added",
      life: 3000
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not add key",
        defaultMessage: `Error in registering key configuration`
      })
    );
  }
};

onMounted(async () => {
  await load();
});
</script>

<template>
  <div>
    <Card>
      <template #title>Keys</template>
      <template #subtitle>
        <p>
          Cryptographic public keys are used across the Wallet to sign or
          encrypt information shared with other parties. For instance,
          Verifiable Credentials include signature(s) that allow a verifier to
          trust the credential is created by the right issuer.
        </p>
        <p>
          The public key of key-pairs generated here will be included in the DID
          document of this Wallet. Alongside signatures the identifier of the
          used key is shared to allow the other party to retrieve the public
          key.
        </p>
      </template>
      <template #content>
        <DataTable
          :value="data"
          lazy
          :loading="loading"
          paginator
          :rows-per-page-options="[5, 10, 25, 50]"
          :total-records="total"
          :first="0"
          :rows="perPage"
          data-key="id"
          sort-field="createdDate"
          :sort-order="1"
          @page="load"
          @sort="load">
          <Column field="id" header="ID" sortable />
          <Column field="type" header="Type" sortable />
          <Column field="default" header="Default" sortable>
            <template #body="props">
              <i
                v-if="props.data.default"
                class="pi pi-check-circle text-green-500" />
              <i v-else class="pi pi-times-circle text-red-500" />
            </template>
          </Column>
          <Column field="algorithm" header="Algorithm">
            <template #body="props">
              <code
                >{{ props.data.publicKey.kty }}
                {{ props.data.publicKey.crv || props.data.publicKey.alg }}</code
              >
            </template>
          </Column>
          <Column field="createdDate" header="Created" sortable>
            <template #body="props">
              {{ formatRelative(props.data.createdDate) }}
            </template>
          </Column>
          <Column field="actions" header="Actions">
            <template #body="props">
              <Button
                severity="primary"
                :disabled="props.data.default"
                @click="setDefaultKey(props.data.id)"
                >Default</Button
              >
              <Button
                class="ml-4"
                severity="danger"
                icon="pi pi-times"
                :disabled="props.data.default"
                @click="deleteKey(props.data.id)" />
            </template>
          </Column>
        </DataTable>
        <Button class="mt-6" label="Show raw keys" @click="rawDialog = true" />
        <Dialog
          v-model:visible="rawDialog"
          modal
          header="Raw keys"
          :style="{ width: '90vw', maxWidth: '75rem' }">
          <MonacoEditorVue :static="data" :read-only="true" :max-lines="100" />
        </Dialog>
      </template>
    </Card>
    <Card class="mt-8">
      <template #title>Add key</template>
      <template #subtitle>
        <p>
          The algorithms supported by the Wallet for key-pairs are: EdDSA,
          ES384, RSA. The first two use elliptic curve cryptography to allow for
          secure but small signatures to be created, RSA is an older algorithm
          that results in larger signatures. EdDSA is recommended, ES384 & RSA
          should only be used in specific scenarios where interoperability with
          other components is required.
        </p>
      </template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="addKey">
          <FormField v-slot="props" label="Type">
            <Select
              :id="props.id"
              v-model="keyForm.type"
              :options="keyTypes"
              option-label="label"
              option-value="value" />
          </FormField>
          <FormField v-slot="props" label="Key ID">
            <InputText :id="props.id" v-model="keyForm.id" class="w-full" />
          </FormField>
          <FormField v-slot="props" label="Default">
            <ToggleSwitch :id="props.id" v-model="keyForm.default" />
          </FormField>
          <FormField
            v-if="keyForm.type === 'X509'"
            v-slot="props"
            label="Existing key (PKCS#8)">
            <Textarea
              :id="props.id"
              v-model="keyForm.existingKey"
              class="w-full"
              style="font-family: monospace"
              rows="10" />
          </FormField>
          <FormField
            v-if="keyForm.type === 'X509'"
            v-slot="props"
            label="Existing certificate (chain) (PEM)">
            <Textarea
              :id="props.id"
              v-model="keyForm.existingCertificate"
              class="w-full"
              style="font-family: monospace"
              rows="10" />
          </FormField>
          <FormField no-label>
            <Button label="Add key" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped></style>
