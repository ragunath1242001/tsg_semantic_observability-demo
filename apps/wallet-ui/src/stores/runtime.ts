import { defineStore } from "pinia";
import http from "@tsg-dsp/common-ui/utils/http";
import { AxiosResponse } from "axios";

interface RuntimeStore {
  gaiaXSupport: boolean;
  title?: string;
}

export const useRuntimeStore = defineStore("runtime", {
  state: (): RuntimeStore => ({
    gaiaXSupport: false,
    title: undefined,
  }),
  actions: {
    async getRuntimeSettings() {
      try {
        const response = await http.get<RuntimeStore>("/settings");
        this.gaiaXSupport = response.data.gaiaXSupport;
        this.title = response.data.title;
      } catch (error) {
        console.debug("Error: ", error);
      }
    },
    async updateRuntimeSettings() {
      try {
        const response = await http.post<
          RuntimeStore,
          AxiosResponse<RuntimeStore>,
          RuntimeStore
        >("/settings/update", {
          gaiaXSupport: this.gaiaXSupport,
          title: this.title,
        });
        this.gaiaXSupport = response.data.gaiaXSupport;
        this.title = response.data.title;
      } catch (error) {
        console.debug("Error: ", error);
      }
    },
  },
});
