<script setup lang="ts">
import { ref } from "vue";
import { type CatalogDto } from "@tsg-dsp/common";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import Catalog from "../components/Catalog.vue";

// Define a ref for the URL input
const urlInput = ref("");
var catalog = ref<CatalogDto>();
var dataAvailable = ref(false);

const http = injectStrict(AxiosKey);

const getCatalog = async () => {
  try {
    const response = await http.get<CatalogDto>(
      `management/catalog/request?address=${urlInput.value}`
    );
    catalog.value = response.data;
    dataAvailable.value = true;
    return catalog;
  } catch (error) {
    // Handle error
    console.error("Error:", error);
    throw error;
  }
};
</script><template>
  <div class="col-12">
    <div class="card">
      <h5>Catalog Request</h5>
      <form @submit="getCatalog">
        <div class="p-fluid formgrid grid">
          <div class="field col-12 md:col-6">
            <span class="p-float-label">
              <InputText id="url" type="text" v-model="urlInput" />
              <label for="url">Url of Catalog to Request</label>
            </span>
          </div>
          <div class="field col-12 md:col-1">
            <Button label="Submit" type="submit"></Button>
          </div>
        </div>
      </form>
    </div>
    <Catalog :catalog="catalog" :url="urlInput" v-if="dataAvailable" />
  </div>
</template>