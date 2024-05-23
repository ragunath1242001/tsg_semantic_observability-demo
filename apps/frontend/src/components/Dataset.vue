<script setup lang="ts">
import { toRefs, ref, toRef, watch, reactive } from "vue";
import { DatasetDto, OfferDto, PolicyDto, ReferenceDto } from "@tsg-dsp/common";
import { useToast } from "primevue/usetoast";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import utils from "../utils/common";
import DisplayField from "./DisplayField.vue";
import MonacoEditor from "./MonacoEditor.vue";
import schema from "../assets/odrl.schema.json";

interface FlatPolicy {
  type: string;
  assigner: string;
  assignee: string;
  target: string;
  action: string;
  leftOperand: string;
  rightOperand: ReferenceDto;
  operator: string;
}

const props = defineProps<{
  datasetData: DatasetDto;
  policy: string;
  address: string;
  didId: string;
  datasetView: boolean;
  ownDataset: boolean;
}>();

const http = injectStrict(AxiosKey);

const toast = useToast();

const datasetDataRo = toRef(props, "datasetData");
var datasetData = reactive(datasetDataRo.value);

const policy = toRef(props, "policy");

const display = ref(false);
var editable = ref(false);

var datasetDataString = ref("");
datasetDataString.value = utils.stringify(datasetDataRo.value);

const emit = defineEmits(["change-dataset-view", "update-datasets"]);

const open = () => {
  display.value = true;
};
const changeEditable = (edit: boolean) => {
  editable.value = !edit;
  return;
};

const goBack = () => {
  emit("change-dataset-view");
};

const parsePolicies = (policies: Array<PolicyDto>): Array<FlatPolicy> => {
  var output: Array<FlatPolicy> = [];
  for (var policy of policies) {
    if (policy["odrl:permission"] !== undefined) {
      output.push.apply(
        output,
        policy["odrl:permission"].map((permission) => {
          return {
            type: "odrl:Permission",
            assigner: policy["odrl:assigner"],
            assignee: policy["odrl:assignee"] || "*",
            target: permission["odrl:target"],
            action: permission["odrl:action"],
            leftOperand:
              permission["odrl:constraint"]?.[0]?.["odrl:leftOperand"],
            rightOperand:
              permission["odrl:constraint"]?.[0]?.["odrl:rightOperand"],
            operator: permission["odrl:constraint"]?.[0]?.["odrl:operator"],
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
          audience: audience,
        },
      }
    );
    toast.add({
      severity: "success",
      summary: "Great!",
      detail: "Successfully sent contract negotiation request",
      life: 3000,
    });
  } catch (e) {
    console.error(
      `Could not send negotiation to address=${address}&audience=${audience} with id ${datasetId}. Error: ${e}`
    );
    toast.add({
      severity: "error",
      summary: "Failed to send negotiation request",
      detail: `${e.response.data.message}`,
      life: 3000,
    });
  }
  display.value = false;
  return;
};
</script>
<template>
  <div class="col-12">
    <Card style="border-radius: 12px; border: 1px solid var(--surface-border)">
      <template #title
        ><div class="flex align-items-center">
          <Button icon="pi pi-chevron-left" rounded @click="goBack()"></Button>
          <h2 class="mx-3">{{ datasetData["dct:title"] }}</h2>
        </div></template
      >
      <template #subtitle
        ><p style="white-space: pre">
          {{ utils.obtainValues(datasetData["dct:description"]).join("\r\n") }}
        </p></template
      >
      <template #content>
        <div class="grid grid-nogutter border-top-1 surface-border">
          <DisplayField
            label="Version"
            v-if="'dcat:hasVersion' in datasetData"
            >{{ datasetData["dcat:hasVersion"]["@id"] }}</DisplayField
          >
          <DisplayField
            label="Current Version"
            v-if="
              'dcat:hasCurrentVersion' in datasetData &&
              datasetData['dcat:hasCurrentVersion']['@id']
            "
          >
            {{ datasetData["dcat:hasCurrentVersion"]["@id"] }}
          </DisplayField>
          <DisplayField label="Endpoint URL">
            <a
              :href="
                datasetData['dcat:distribution'][0]['dcat:accessService'][0][
                  'dcat:endpointURL'
                ]
              "
            >
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
            label="Conforms to"
            v-if="'dcat:conformsTo' in datasetData['dcat:distribution'][0]"
          >
            <a
              :href="
                datasetData['dcat:distribution'][0]['dcat:conformsTo']['@id']
              "
            >
              {{
                datasetData["dcat:distribution"][0]["dcat:conformsTo"]["@id"]
              }}</a
            >
          </DisplayField>
          <DisplayField label="Keywords"
            ><Tag
              class="mr-2 text-900 bg-primary-700"
              v-for="keyword in utils.obtainValues(datasetData['dcat:keyword'])"
              :key="keyword"
              :value="keyword"
            ></Tag
          ></DisplayField>
        </div>
        <h5 class="pt-3">Policies</h5>
        <div
          class="grid grid-nogutter border-top-1 surface-border mt-2"
          v-if="
            datasetData['odrl:hasPolicy'] &&
            datasetData['odrl:hasPolicy'].length > 0
          "
        >
          <template
            v-for="policy in parsePolicies(datasetData['odrl:hasPolicy'])"
          >
            <DisplayField label="Type">
              {{ policy.type }}
            </DisplayField>
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
            <DisplayField label="Left Operand">
              {{ policy.leftOperand }}
            </DisplayField>
            <DisplayField label="Operator">
              {{ policy.operator }}
            </DisplayField>
            <DisplayField label="Right Operand">
              {{ policy.rightOperand }}
            </DisplayField>
          </template>
          <div class="col-12" v-if="!props.ownDataset">
            <div class="col-6 col-offset-3">
              <Button
                severity="success"
                raised
                label="Negotiate Contract"
                class="text-center p-3"
                style="width: 100%"
                @click="open"
              />
            </div>
            <Dialog
              header="Are you sure you want to send the following negotiation message?"
              v-model:visible="display"
              :breakpoints="{ '960px': '78vw' }"
              :modal="true"
            >
              <div class="grid">
                <div class="col">
                  <MonacoEditor
                    :schema="schema"
                    v-model="policy"
                    :read-only="!editable"
                    :maxLines="25"
                  />
                </div>
                <div class="col-fixed" style="width: 55px">
                  <Button
                    icon="pi pi-pencil"
                    size="small"
                    class="p-button-rounded mt-1 mb-2"
                    @click="changeEditable(editable)"
                  />
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
                  "
                />
              </template>
            </Dialog>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
