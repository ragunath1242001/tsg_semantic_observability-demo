import { defineStore } from "pinia";
import { type CatalogDto } from "@tsg-dsp/common-dsp";

interface ICatalogStore {
  catalog: CatalogDto;
  urlInput: string;
  assigner: string;
  didInput: string;
}

export const useCatalogStore = defineStore("catalog", {
  state: (): ICatalogStore => ({
    catalog: null,
    urlInput: "",
    assigner: "",
    didInput: ""
  }),

  getters: {},

  actions: {
    updateCatalog(payload: ICatalogStore) {
      this.catalog = payload.catalog;
      this.urlInput = payload.urlInput;
      this.assigner = payload.assigner;
      this.didInput = payload.didInput;
    }
  }
});
