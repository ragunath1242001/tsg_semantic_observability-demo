<script setup lang="ts">
import { Action, Resource } from "@tsg-dsp/common-dtos";
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import http from "@tsg-dsp/common-ui/utils/http";
import {
  DCPCredentialRequestInitiation,
  OID4VCICredentialRequestInitiation
} from "@tsg-dsp/wallet-dtos";
import { useToast } from "primevue/usetoast";
import { computed, ref } from "vue";

const toast = useToast();
const userStore = useUserStore();
const canRequestCredential = computed(() =>
  userStore.canAccessRoute(Action.MANAGE, Resource.W_CREDENTIAL)
);

const flows = ref([
  {
    label: "Decentralized Claims Protocol",
    code: "DCP",
    flows: [
      {
        label: "Pre Authorized Code Flow (DCP)",
        value: {
          protocol: "dcp",
          variant: "pre-authorized-code"
        }
      }
    ]
  },
  {
    label: "OpenID 4 Verifiable Credential Issuance",
    code: "OID4VCI",
    flows: [
      {
        label: "Pre Authorized Code Flow (OID4VCI)",
        value: {
          protocol: "oid4vci",
          variant: "pre-authorized-code"
        }
      },
      {
        label: "Authorization Code Flow (OID4VCI)",
        value: {
          protocol: "oid4vci",
          variant: "authorization-code"
        }
      }
    ]
  }
]);

interface RequestForm {
  preAuthorizedCode: string;
  issuer: string;
  flow: {
    protocol: "dcp" | "oid4vci";
    variant: "pre-authorized-code" | "authorization-code";
  };
  credentialType: string;
  authorized: {
    accessToken: string;
    credentialIdentifier: string;
    additionalRequestParams: {
      credential: string;
    };
  };
}

const requestForm = ref<RequestForm>({
  preAuthorizedCode: "",
  issuer: "",
  flow: {
    protocol: "dcp",
    variant: "pre-authorized-code"
  },
  credentialType: "",
  authorized: {
    accessToken: "",
    credentialIdentifier: "",
    additionalRequestParams: {
      credential: ""
    }
  }
});

const retrieveCredential = async () => {
  try {
    const { flow, ...form } = JSON.parse(
      JSON.stringify(requestForm.value)
    ) as RequestForm;
    let request:
      | DCPCredentialRequestInitiation
      | OID4VCICredentialRequestInitiation;
    switch (flow.protocol) {
      case "dcp":
        switch (flow.variant) {
          case "pre-authorized-code":
            if (!form.preAuthorizedCode) {
              throw Error("Pre authorized code is required for this flow");
            }
            if (form.credentialType?.trim() === "") {
              throw Error("Credential type is required for this flow");
            }
            request = {
              issuerId: form.issuer,
              preAuthorizedCode: form.preAuthorizedCode,
              credentialType: [form.credentialType]
            };
            break;
          case "authorization-code":
            throw Error("Invalid flow");
        }
        break;
      case "oid4vci":
        switch (flow.variant) {
          case "pre-authorized-code":
            if (!form.preAuthorizedCode) {
              throw Error("Pre authorized code is required for this flow");
            }
            request = {
              issuerUrl: form.issuer,
              preAuthorizedCode: form.preAuthorizedCode
            };
            break;
          case "authorization-code":
            if (
              !form.authorized?.accessToken ||
              !form.authorized?.credentialIdentifier
            ) {
              throw Error(
                "Access token and credential identifier are required for this flow"
              );
            }
            request = {
              issuerUrl: form.issuer,
              authorized: {
                accessToken: form.authorized.accessToken,
                credentialIdentifier: form.authorized.credentialIdentifier
              }
            };
            if (
              form.authorized?.additionalRequestParams?.credential &&
              form.authorized?.additionalRequestParams?.credential?.trim() !==
                ""
            ) {
              try {
                JSON.parse(form.authorized.additionalRequestParams.credential);
                request.authorized.additionalRequestParams =
                  form.authorized.additionalRequestParams;
              } catch (error) {
                throw Error(
                  "Request parameters must be a valid JSON document",
                  {
                    cause: error
                  }
                );
              }
            }
            break;
        }
        break;
    }

    await http.post(`management/issuance/request/${flow.protocol}`, request);
    toast.add({
      severity: "success",
      summary: "Credential retrieved",
      detail: `Credential successfully retrieved, go to the credential overview to see the credential`,
      life: 10000
    });
    requestForm.value = {
      issuer: "",
      preAuthorizedCode: "",
      credentialType: "",
      authorized: {
        accessToken: "",
        credentialIdentifier: "",
        additionalRequestParams: {
          credential: ""
        }
      },
      flow: {
        protocol: "dcp",
        variant: "pre-authorized-code"
      }
    };
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not retrieve credential",
        defaultMessage: `Error in retrieving credential`
      })
    );
  }
};
</script>

<template>
  <div>
    <Card>
      <template #title>Credential Issuance Request</template>
      <template #subtitle>
        <p>
          This page allows issuers to create and manage credential offers. These
          offers can be used by holders to request credentials from the issuer.
          Currently two types of issuance protocols are supported: the
          <a
            class="underline hover:no-underline"
            href="https://eclipse-dataspace-dcp.github.io/decentralized-claims-protocol"
            target="_blank"
            >Decentralized Claims Protocol</a
          >
          and the
          <a
            class="underline hover:no-underline"
            href="https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html"
            target="_blank"
            >OpenID 4 Verifiable Credential Issuance</a
          >
          protocol.
        </p>
      </template>
    </Card>
    <Card v-if="canRequestCredential" class="mt-8">
      <template #title>Request credential</template>
      <template #subtitle>
        <p>
          Request a new credential as intended holder of the credential from an
          issuer that has created a credential offer.
        </p>
        <p>
          The Decentralized Claims Protocol flow requires a pre-authorized code,
          for the OpenID 4 Verifiable Credential Issuance protocol both the
          pre-authorized as the authorization code flows are supported. For the
          pre-authorized code flow should be provided by the issuer in an
          out-of-band manner before you start this flow as holder. For the
          Authorization code flow at least an access token and credential
          identifier should be provided, with optional addtional request
          parameters.
        </p>
      </template>
      <template #content>
        <form class="flex flex-col gap-4" @submit.prevent="retrieveCredential">
          <FormField v-slot="props" label="Flow">
            <Select
              :id="props.id"
              v-model="requestForm.flow"
              class="w-full"
              :options="flows"
              option-group-label="label"
              option-group-children="flows"
              option-label="label"
              option-value="value"
              placeholder="Flow" />
          </FormField>
          <FormField
            v-slot="props"
            :label="
              requestForm.flow.protocol === 'dcp' ? 'Issuer ID' : 'Issuer URL'
            ">
            <InputText
              :id="props.id"
              v-model="requestForm.issuer"
              class="w-full"
              :placeholder="
                requestForm.flow.protocol === 'dcp' ? 'Issuer ID' : 'Issuer URL'
              "
              required />
          </FormField>
          <FormField
            v-if="requestForm.flow.variant === 'pre-authorized-code'"
            v-slot="props"
            label="Pre Authorized code">
            <InputText
              :id="props.id"
              v-model="requestForm.preAuthorizedCode"
              class="w-full"
              placeholder="Pre Authorized code received from issuer"
              required />
          </FormField>
          <FormField
            v-if="
              requestForm.flow.variant === 'pre-authorized-code' &&
              requestForm.flow.protocol === 'dcp'
            "
            v-slot="props"
            label="Credential Type">
            <InputText
              :id="props.id"
              v-model="requestForm.credentialType"
              class="w-full"
              placeholder="Credential type to request"
              required />
          </FormField>
          <FormField
            v-if="requestForm.flow.variant === 'authorization-code'"
            v-slot="props"
            label="Access token">
            <InputText
              :id="props.id"
              v-model="requestForm.authorized.accessToken"
              class="w-full"
              placeholder="Access token"
              required />
          </FormField>
          <FormField
            v-if="requestForm.flow.variant === 'authorization-code'"
            v-slot="props"
            label="Credential ID">
            <InputText
              :id="props.id"
              v-model="requestForm.authorized.credentialIdentifier"
              class="w-full"
              placeholder="Credential ID"
              required />
          </FormField>
          <FormField
            v-if="requestForm.flow.variant === 'authorization-code'"
            label="Request parameters">
            <MonacoEditorVue
              v-model="
                requestForm.authorized.additionalRequestParams.credential
              "></MonacoEditorVue>
          </FormField>
          <FormField no-label>
            <Button label="Request credential" type="submit" />
          </FormField>
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped></style>
