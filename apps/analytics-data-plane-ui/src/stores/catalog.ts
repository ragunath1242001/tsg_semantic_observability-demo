import { CatalogDto } from "@tsg-dsp/common-dsp";
import { defineStore } from "pinia";
import http from "@tsg-dsp/common-ui/utils/http";

export interface CatalogStore {
  catalog: CatalogDto | null;
  title: string;
}

export const useCatalogStore = defineStore("catalog", {
  state: (): CatalogStore => ({
    catalog: null,
    title: ""
  }),
  actions: {
    async getOwnCatalog() {
      try {
        const response = await http.get<CatalogDto>("management/catalog");
        this.catalog = response.data;
        if (response.data?.["dct:title"]) {
          this.title = response.data?.["dct:title"];
          window.document.title = `Analytics Data Plane - ${this.title}`;
        }
      } catch (error) {
        // Handle error
        console.error("Error:", error);
        throw error;
      }
    }
  }
});
