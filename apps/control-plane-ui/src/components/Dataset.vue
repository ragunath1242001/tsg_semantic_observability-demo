<script setup lang="ts">
import {
  DatasetDto,
  OfferDto,
  PolicyDto,
  ReferenceDto
} from "@tsg-dsp/common-dsp";
import schema from "@tsg-dsp/common-ui/assets/odrl.schema.json";
import DisplayField from "@tsg-dsp/common-ui/components/DisplayField.vue";
import MonacoEditor from "@tsg-dsp/common-ui/components/MonacoEditor.vue";
import { obtainValues, stringify } from "@tsg-dsp/common-ui/utils/common";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { useToast } from "primevue/usetoast";
import { reactive, ref, toRef } from "vue";

import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";

interface Constraint {
  leftOperand: string;
  rightOperand: ReferenceDto;
  operator: string;
}
interface FlatPolicy {
  type: string;
  assigner: string;
  assignee: string;
  target: string;
  action: string;
  constraints: Constraint[];
}

const props = defineProps<{
  datasetDataProp: DatasetDto;
  policy: string;
  address: string;
  didId: string;
  datasetView: boolean;
  ownDataset: boolean;
}>();

const http = injectStrict(AxiosKey);

const toast = useToast();

const datasetDataRo = toRef(props, "datasetDataProp");
const datasetData = reactive(datasetDataRo.value);

const policy = toRef(props, "policy");

const display = ref(false);
const editable = ref(false);

const datasetDataString = ref("");
datasetDataString.value = stringify(datasetDataRo.value);

const emit = defineEmits(["change-dataset-view", "update-datasets"]);

const open = () => {
  display.value = true;
};
const changeEditable = (edit: boolean) => {
  editable.value = !edit;
  return;
};

const stripOdrl = (value: string) => {
  return value.slice(5);
};

const goBack = () => {
  emit("change-dataset-view");
};

const parsePolicies = (policies: Array<PolicyDto>): Array<FlatPolicy> => {
  const output: Array<FlatPolicy> = [];
  for (const policy of policies) {
    if (policy["odrl:permission"] !== undefined) {
      output.push.apply(
        output,
        policy["odrl:permission"].map((permission) => {
          return {
            type: permission["@type"],
            assigner: policy["odrl:assigner"],
            assignee: policy["odrl:assignee"] || "*",
            target: permission["odrl:target"],
            action: permission["odrl:action"],
            constraints: permission["odrl:constraint"]?.map((constraint) => {
              return {
                leftOperand: constraint["odrl:leftOperand"],
                rightOperand: constraint["odrl:rightOperand"],
                operator: constraint["odrl:operator"]
              };
            })
          } as FlatPolicy;
        })
      );
    }
    if (policy["odrl:prohibition"] !== undefined) {
      output.push.apply(
        output,
        policy["odrl:prohibition"].map((prohibition) => {
          return {
            type: prohibition["@type"],
            assigner: policy["odrl:assigner"],
            assignee: policy["odrl:assignee"] || "*",
            target: prohibition["odrl:target"],
            action: prohibition["odrl:action"],
            constraints: prohibition["odrl:constraint"]?.map((constraint) => {
              return {
                leftOperand: constraint["odrl:leftOperand"],
                rightOperand: constraint["odrl:rightOperand"],
                operator: constraint["odrl:operator"]
              };
            })
          } as FlatPolicy;
        })
      );
    } else {
      console.log(`No permissions found in ${JSON.stringify(policy)}`);
    }
  }
  return output;
};

const sendNegotiation = async (
  datasetId: string,
  address: string,
  audience: string
) => {
  try {
    await http.post(
      "management/negotiations/request",
      JSON.parse(policy.value) as OfferDto,
      {
        params: {
          dataSet: datasetId,
          address: address,
          audience: audience
        }
      }
    );
    toast.add({
      severity: "success",
      summary: "Great!",
      detail: "Successfully sent contract negotiation request",
      life: 3000
    });
  } catch (error) {
    console.error(
      `Could not send negotiation to address=${address}&audience=${audience} with id ${datasetId}. Error: ${error}`
    );
    toast.add(
      toastError({
        error,
        summary: "Failed to send negotiation request",
        defaultMessage: `Could not send negotiation to address=${address}&audience=${audience} with id ${datasetId}`
      })
    );
  }
  display.value = false;
  return;
};
</script>
<template>
  <div class="col-span-12">
    <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
      <template #title
        ><div class="flex items-center">
          <Button icon="pi pi-chevron-left" rounded @click="goBack()"></Button>
          <h2
            v-tooltip.top="datasetData['dct:title']"
            class="mx-4 bg-surface-0 dark:bg-surface-900 whitespace-nowrap overflow-hidden text-ellipsis">
            {{ datasetData["dct:title"] }}
          </h2>
        </div></template
      >
      <template #subtitle>
        {{ obtainValues(datasetData["dct:description"]).join("\r\n") }}
      </template>
      <template #content>
        <div
          class="grid grid-cols-12 gap-4 grid-nogutter border-t border-surface">
          <DisplayField v-if="'dcat:hasVersion' in datasetData" label="Versions"
            ><div
              v-for="version in datasetData['dcat:hasVersion']"
              :key="version">
              {{ version }}
            </div>
          </DisplayField>
          <DisplayField
            v-if="
              'dcat:hasCurrentVersion' in datasetData &&
              datasetData['dcat:hasCurrentVersion']
            "
            label="Current Version">
            {{ datasetData["dcat:hasCurrentVersion"] }}
          </DisplayField>
          <DisplayField label="Endpoint URL">
            <a
              :href="
                datasetData['dcat:distribution'][0]['dcat:accessService'][0][
                  'dcat:endpointURL'
                ]
              ">
              {{
                datasetData["dcat:distribution"][0]["dct:title"]
                  ? datasetData["dcat:distribution"][0]["dct:title"]
                  : datasetData["dcat:distribution"][0][
                      "dcat:accessService"
                    ][0]["dcat:endpointURL"]
              }}</a
            >
          </DisplayField>
          <DisplayField label="Format">
            {{ datasetData["dcat:distribution"][0]["dct:format"] }}
          </DisplayField>
          <DisplayField
            v-if="'dct:conformsTo' in datasetData['dcat:distribution'][0]"
            label="Conforms to">
            <a
              v-for="conformsTo in datasetData['dcat:distribution'][0][
                'dct:conformsTo'
              ]"
              :key="conformsTo"
              :href="conformsTo"
              class="mr-2 break-all">
              {{ conformsTo }}</a
            >
          </DisplayField>
          <DisplayField label="Keywords"
            ><Tag
              v-for="keyword in obtainValues(datasetData['dcat:keyword'])"
              :key="keyword"
              class="mr-2 text-surface-900 dark:text-surface-0 bg-primary-700"
              :value="keyword"></Tag
          ></DisplayField>
        </div>
        <Divider />
        <template
          v-if="
            datasetData?.['odrl:hasPolicy'] &&
            datasetData?.['odrl:hasPolicy'].length > 0
          ">
          <div
            class="pb-8 font-medium text-2xl text-surface-900 dark:text-surface-0">
            Policies
          </div>

          <template
            v-for="policy in parsePolicies(datasetData['odrl:hasPolicy'])"
            :key="policy">
            <div
              class="px-2 font-medium text-lg text-surface-700 dark:text-surface-100">
              {{ stripOdrl(policy.type) }}
            </div>
            <div class="grid grid-cols-12 gap-4 grid-nogutter">
              <DisplayField label="Assigner">
                {{ policy.assigner }}
              </DisplayField>
              <DisplayField label="Assignee">
                {{ policy.assignee }}
              </DisplayField>
              <DisplayField label="Target">
                {{ policy.target }}
              </DisplayField>
              <DisplayField label="Action">
                {{ policy.action }}
              </DisplayField>
            </div>
            <div
              v-if="policy.constraints"
              class="p-4 font-medium text-lg text-surface-700 dark:text-surface-100">
              Constraints
            </div>
            <div
              v-for="(constraint, idx) in policy.constraints"
              :key="idx"
              class="grid grid-cols-12 gap-4 grid-nogutter">
              <DisplayField label="Left Operand">
                {{ constraint.leftOperand }}
              </DisplayField>
              <DisplayField label="Operator">
                {{ constraint.operator }}
              </DisplayField>
              <DisplayField label="Right Operand">
                {{ constraint.rightOperand }}
              </DisplayField>
            </div>
            <Divider />
          </template>
          <div v-if="!props.ownDataset" class="grid grid-cols-7">
            <div class="col-span-1 col-start-4">
              <Button
                severity="success"
                raised
                label="Negotiate Contract"
                class="text-center p-4"
                style="width: 100%"
                @click="open" />
            </div>
            <Dialog
              v-model:visible="display"
              header="Are you sure you want to send the following negotiation message?"
              :breakpoints="{ '960px': '78vw' }"
              :modal="true">
              <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 md:col-span-11">
                  <MonacoEditor
                    v-model="policy"
                    :schema="schema"
                    :read-only="!editable"
                    :max-lines="25" />
                </div>
                <div class="col-span-12 md:col-span-1">
                  <Button
                    icon="pi pi-pencil"
                    size="small"
                    class="p-button-rounded mt-1 mb-2"
                    @click="changeEditable(editable)" />
                </div>
              </div>
              <template #footer>
                <Button
                  label="Send"
                  icon="pi pi-check"
                  type="submit"
                  class="p-button-outlined"
                  @click="
                    sendNegotiation(
                      datasetData['@id'],
                      props.address,
                      props.didId
                    )
                  " />
              </template>
            </Dialog>
          </div>
        </template>
      </template>
    </Card>
  </div>
</template>
