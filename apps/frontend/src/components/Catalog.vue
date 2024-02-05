<script setup lang="ts">
import { ref } from "vue";
import {
  PolicyDto,
  ReferenceDto,
  type CatalogDto,
  type DatasetDto,
  type MultilanguageDto,
} from "@tsg-dsp/common";
import { JsonTreeView } from "json-tree-view-vue3";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";

defineProps<{
  catalog: CatalogDto;
}>();

const urlInput = ref("");
const parsedView = ref(true);
var datasetView = ref(false);
var datasetData = ref<DatasetDto>();

const http = injectStrict(AxiosKey);

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
      `management/catalog/dataset?address=${urlInput.value}&id=${datasetId}`
    );
    datasetData.value = response.data;
    datasetView.value = true;
    return datasetData;
  } catch (e) {
    console.error(
      `Could not retrieve dataset with id ${datasetId}. Error: ${e}`
    );
  }
};
</script><template>
  <div class="grid">
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
        v-for="dataset in catalog['dcat:dataset']"
        :key="dataset['@id']"
      >
        <Card>
          <template #title>{{ dataset["dct:title"] }}</template>
          <template #content>
            <p style="white-space: pre">
              {{ obtainValues(dataset["dct:description"]).join("\r\n") }}
            </p>
            <div class="flex flex-wrap justify-content-center gap-3">
              <button
                class="p-button p-component p-button-icon-only p-button-rounded p-button-outlined w-5rem h-5rem"
                type="button"
                @click="getDataset(dataset['@id'])"
              >
                <i
                  class="pi pi-file text-primary"
                  style="font-size: 3.5rem"
                ></i>
              </button>
            </div>
            <div class="pt-1 pb-1"><b>Keywords </b></div>
            <Tag
              class="mr-1 bg-primary-700"
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
          </div>
        </div>
      </div>
    </template>
  </div>
</template>