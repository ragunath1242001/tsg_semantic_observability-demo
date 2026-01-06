import { CatalogDto } from "@tsg-dsp/common-dsp";
import http from "@tsg-dsp/common-ui/utils/http";
import { defineStore } from "pinia";

import { useRuntimeStore } from "./runtime";

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
      const runtimeStore = useRuntimeStore();
      if (runtimeStore.isClientMode) {
        this.catalog = null;
        this.title = "Client Mode";
        window.document.title = `Analytics Data Plane (Client Mode)`;
        return;
      }
      try {
        const response = await http.get<CatalogDto>("management/catalog");
        this.catalog = response.data;
        if (response.data?.title) {
          this.title = runtimeStore.isServerMode
            ? `Server Mode - ${response.data.title}`
            : response.data.title;
          window.document.title = `Analytics Data Plane ${runtimeStore.isServerMode ? "(Server Mode)" : ""} - ${this.title}`;
        }
      } catch (error) {
        // Handle error
        console.error("Error:", error);
        throw error;
      }
    }
  }
});
