<script setup lang="ts">
import { toRefs, ref, toRef, watch, reactive } from "vue";
import { DatasetDto, OfferDto, PolicyDto, ReferenceDto } from "@tsg-dsp/common";
import { useToast } from "primevue/usetoast";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import utils from "../utils/common";

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
  type: "consumer" | "provider";
}>();

const http = injectStrict(AxiosKey);

const toast = useToast();

const datasetDataRo = toRef(props, "datasetData");
var datasetData = reactive(datasetDataRo.value);

const policy = toRef(props, "policy");

const display = ref(false);
var editable = ref(true);

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
            type: "permission",
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
    <div class="card">
      <div class="flex align-items-center justify-content-between">
        <Button icon="pi pi-chevron-left" rounded @click="goBack()"></Button>
      </div>

      <div class="grid">
        <div class="col">
          <h2 class="pt-3">{{ datasetData["dct:title"] }}</h2>
          <p style="white-space: pre">
            {{
              utils.obtainValues(datasetData["dct:description"]).join("\r\n")
            }}
          </p>
          <div class="pt-1 pb-2"><b>Keywords</b></div>
          <Tag
            class="mr-2 bg-primary-700"
            v-for="keyword in utils.obtainValues(datasetData['dcat:keyword'])"
            :key="keyword"
            :value="keyword"
          ></Tag>
          <template
            v-if="
              datasetData['dcat:distribution'][0]['dcat:accessService'][0][
                'dcat:endpointURL'
              ]
            "
            ><p>
              <b>Accessible via: </b>
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
            </p></template
          >
        </div>
        <div
          class="col"
          v-if="
            datasetData['odrl:hasPolicy'] &&
            datasetData['odrl:hasPolicy'].length > 0
          "
        >
          <h5 class="pt-3">Policies</h5>
          <DataTable
            :value="parsePolicies(datasetData['odrl:hasPolicy'])"
            :rows="5"
            :paginator="true"
          >
            <Column field="type" header="Type"></Column>
            <Column field="assigner" header="Assigner"> </Column>
            <Column field="assignee" header="Assignee"> </Column>
            <Column field="target" header="Target" style="width: 35%"></Column>
            <Column field="action" header="Action" style="width: 35%"> </Column>
            <Column header="leftOperand" field="leftOperand" style="width: 15%">
            </Column>
            <Column header="operator" field="operator" style="width: 15%">
            </Column>
            <Column
              header="rightOperand"
              field="rightOperand"
              style="width: 15%"
            >
            </Column>
          </DataTable>
        </div>
        <div class="col-12" v-if="props.type == 'consumer'">
          <Dialog
            header="Are you sure you want to send the following negotiation message?"
            v-model:visible="display"
            :breakpoints="{ '840px': '75vw' }"
            :modal="true"
          >
            <div class="grid">
              <div class="col">
                <Textarea
                  id="policyEl"
                  ref="policyElement"
                  rows="10"
                  variant="filled"
                  contenteditable
                  style="width: 100%"
                  autoResize
                  v-model="policy"
                  :disabled="editable"
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
              <form
                @submit="
                  sendNegotiation(
                    datasetData['@id'],
                    props.address,
                    props.didId
                  )
                "
              >
                <Button
                  label="Send"
                  icon="pi pi-check"
                  type="submit"
                  class="p-button-outlined"
                />
              </form>
            </template>
          </Dialog>

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
        </div>
      </div>
    </div>
  </div>
</template>
