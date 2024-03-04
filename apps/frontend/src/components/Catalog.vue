<script setup lang="ts">
import { ref, toRefs } from "vue";
import {
  OfferDto,
  PolicyDto,
  ReferenceDto,
  type CatalogDto,
  type DatasetDto,
  type MultilanguageDto,
} from "@tsg-dsp/common";
import { JsonTreeView } from "json-tree-view-vue3";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import { useToast } from "primevue/usetoast";

const props = defineProps<{
  catalog: CatalogDto;
  url: string;
  assigner: string;
  type: "provider" | "consumer";
}>();

const display = ref(false);
const parsedView = ref(true);
const editable = ref(true);
const policy = ref("");
var datasetView = ref(false);
var datasetData = ref<DatasetDto>();

const { catalog, url, assigner } = toRefs(props);

const http = injectStrict(AxiosKey);

const toast = useToast();

const obtainValues = (multilingualArray: Array<MultilanguageDto | String>) => {
  if (multilingualArray !== undefined && Array.isArray(multilingualArray)) {
    return multilingualArray.map((element) =>
      typeof element == "object"
        ? (element as MultilanguageDto)["@value"]
        : typeof element === "string"
        ? element
        : (() => {
            console.error(
              `Could not obtain value from ${multilingualArray}, unknown type`
            );
            return "";
          })()
    );
  } else {
    return [];
  }
};

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

const parsePolicies = (policies: Array<PolicyDto>): Array<FlatPolicy> => {
  var output: Array<FlatPolicy> = [];
  for (var policy of policies) {
    if (
      policy["odrl:permission"] !== undefined ||
      policy["permission"] !== undefined
    ) {
      output.push.apply(
        output,
        (policy["odrl:permission"] || policy["permission"]).map(
          (permission) => {
            return {
              type: "permission",
              assigner: policy["odrl:assigner"] || policy["assigner"],
              assignee: policy["odrl:assignee"] || policy["assignee"] || "*",
              target: permission["odrl:target"] || permission["target"],
              action: permission["odrl:action"] || permission["action"],
              leftOperand:
                permission["odrl:constraint"]?.[0]?.["odrl:leftOperand"] ||
                permission["constraint"]?.[0]?.["leftOperand"],
              rightOperand:
                permission["odrl:constraint"]?.[0]?.["odrl:rightOperand"] ||
                permission["constraint"]?.[0]?.["rightOperand"],
              operator:
                permission["odrl:constraint"]?.[0]?.["odrl:operator"] ||
                permission["constraint"]?.[0]?.["operator"],
            } as FlatPolicy;
          }
        )
      );
    } else {
      console.log(`No permissions found in ${JSON.stringify(policy)}`);
    }
  }
  return output;
};
const getDataset = async (datasetId: String) => {
  try {
    const response = await http.get<DatasetDto>(
      `management/catalog/dataset?address=${url.value}&id=${datasetId}`
    );
    datasetData.value = response.data;
    policy.value = createPolicy(datasetData.value["odrl:hasPolicy"][0]);
    datasetView.value = true;
    return datasetData;
  } catch (e) {
    console.error(
      `Could not retrieve dataset with id ${datasetId}. Error: ${e}`
    );
  }
};
const calculateColor = (index: number) => {
  const colors = ["primary", "orange", "cyan", "purple"];
  return colors[index % 4];
};
const calculateTagClass = (index: number) => {
  return `mr-2 bg-${calculateColor(index)}-100 text-${calculateColor(
    index
  )}-700`;
};
const calculateIconBg = (index: number) => {
  return `p-button p-component p-button-icon-only p-button-rounded flex-shrink-0 w-5rem h-5rem bg-${calculateColor(
    index
  )}-100`;
};

const calculateIconClass = (index: number) => {
  return `pi pi-file text-${calculateColor(index)}-500`;
};

const open = () => {
  display.value = true;
};

const createPolicy = (policy: PolicyDto): string => {
  delete policy["id"];
  const offer = {
    ...policy,
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "odrl:Offer",
    "@id": `urn:uuid:${crypto.randomUUID()}`,
    "odrl:assigner": assigner.value,
    "odrl:permission": policy["permission"],
  };
  delete offer["permission"];
  return JSON.stringify(offer, null, 2);
};
const changeEditable = (edit: boolean) => {
  editable.value = !edit;
  return;
};
const sendNegotiation = async (
  datasetId: string,
  address: string,
  audience: string
) => {
  try {
    await http.post(
      `management/negotiations/request?dataSet=${datasetId}&address=${address}&audience=${audience}`,
      JSON.parse(policy.value) as OfferDto
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
</script><template>
  <div class="grid card-container">
    <div class="col-12">
      <div class="card" v-if="!datasetView">
        <div class="flex align-items-center mb-4 gap-2">
          <label>Parsed View </label><InputSwitch v-model="parsedView" />
        </div>
        <JsonTreeView
          v-if="!parsedView"
          :data="JSON.stringify(catalog)"
          :maxDepth="3"
          color-scheme="dark"
          rootKey="Catalog"
        />
        <div class="grid" v-if="parsedView">
          <div class="col">
            <h5>{{ catalog["dct:title"] }}</h5>
            <p style="white-space: pre">
              {{ obtainValues(catalog["dct:description"]).join("\r\n") }}
            </p>
            <p v-if="obtainValues(catalog['dcat:keyword']).length > 0">
              <b>Keywords </b>
            </p>
            <Tag
              class="mr-2 bg-primary-700"
              v-for="keyword in obtainValues(catalog['dcat:keyword'])"
              :key="keyword"
              :value="keyword"
            ></Tag>
          </div>
          <div class="col">
            <p v-if="catalog['dct:publisher']">
              <b>Publisher</b> {{ catalog["dct:publisher"] }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <template v-if="!datasetView && parsedView && catalog['dcat:dataset']">
      <div
        class="col-12 lg:col-6 xl:col-3"
        v-for="(dataset, index) in catalog['dcat:dataset']"
        :key="dataset['@id']"
      >
        <Card
          style="border-radius: 12px; border: 1px solid var(--surface-border)"
        >
          <template #title>{{ dataset["dct:title"] }}</template>
          <template #content>
            <p style="white-space: pre">
              {{ obtainValues(dataset["dct:description"]).join("\r\n") }}
            </p>
            <div class="flex flex-wrap justify-content-center gap-3">
              <button
                :class="calculateIconBg(index)"
                type="button"
                @click="getDataset(dataset['@id'])"
              >
                <i
                  :class="calculateIconClass(index)"
                  style="font-size: 2.5rem"
                ></i>
              </button>
            </div>
            <div class="pt-1 pb-1"><b>Keywords </b></div>
            <Tag
              :class="calculateTagClass(index)"
              v-for="keyword in obtainValues(dataset['dcat:keyword'])"
              :key="keyword"
              :value="keyword"
            ></Tag>
          </template>
          <template #footer>
            <div class="flex align-items-center justify-content-between">
              <span class="font-semibold"
                >Policies: {{ dataset["odrl:hasPolicy"]?.length ?? 0 }}</span
              >
              <Button
                icon="pi pi-external-link"
                @click="getDataset(dataset['@id'])"
                size="large"
                rounded
                outlined
              />
            </div>
          </template>
        </Card>
      </div>
    </template>
    <template v-else-if="parsedView && !catalog['dcat:dataset']">
      <div class="col-12 lg:col-6 xl:col-3">
        <Card>
          <template #title>Empty Catalog.</template>
          <template #content>
            <p>No datasets were found in this catalog.</p>
          </template>
        </Card>
      </div>
    </template>
    <template v-if="datasetView">
      <div class="col-12">
        <div class="card">
          <Button
            icon="pi pi-chevron-left"
            rounded
            @click="datasetView = false"
          ></Button>
          <div class="grid">
            <div class="col">
              <h2 class="pt-3">{{ datasetData["dct:title"] }}</h2>
              <p style="white-space: pre">
                {{ obtainValues(datasetData["dct:description"]).join("\r\n") }}
              </p>
              <div class="pt-1 pb-2"><b>Keywords</b></div>
              <Tag
                class="mr-2 bg-primary-700"
                v-for="keyword in obtainValues(datasetData['dcat:keyword'])"
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
                      datasetData['dcat:distribution'][0][
                        'dcat:accessService'
                      ][0]['dcat:endpointURL']
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
                <Column
                  field="target"
                  header="Target"
                  style="width: 35%"
                ></Column>
                <Column field="action" header="Action" style="width: 35%">
                </Column>
                <Column
                  header="leftOperand"
                  field="leftOperand"
                  style="width: 15%"
                >
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
                        datasetData['dct:title']
                          ? datasetData['dct:title']
                          : datasetData['@id'],
                        url,
                        catalog['dct:publisher']
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
  </div>
</template>