import http from "@tsg-dsp/common-ui/utils/http";
import { AxiosResponse } from "axios";
import { defineStore } from "pinia";

interface RuntimeStore {
  gaiaXSupport: boolean;
  title?: string;
  color?: string;
  darkThemeUrl?: string;
  lightThemeUrl?: string;
}

export const useRuntimeStore = defineStore("runtime", {
  state: (): RuntimeStore => ({
    gaiaXSupport: false,
    title: undefined,
    color: undefined,
    darkThemeUrl: undefined,
    lightThemeUrl: undefined
  }),
  actions: {
    async getRuntimeSettings() {
      try {
        const response = await http.get<RuntimeStore>("/settings");
        this.gaiaXSupport = response.data.gaiaXSupport;
        this.title = response.data.title;
        this.color = response.data.color;
        this.darkThemeUrl = response.data.darkThemeUrl;
        this.lightThemeUrl = response.data.lightThemeUrl;
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
          color: this.color,
          darkThemeUrl: this.darkThemeUrl,
          lightThemeUrl: this.lightThemeUrl
        });
        this.gaiaXSupport = response.data.gaiaXSupport;
        this.title = response.data.title;
        this.color = response.data.color;
        this.lightThemeUrl = response.data.lightThemeUrl;
        this.darkThemeUrl = response.data.darkThemeUrl;
      } catch (error) {
        console.debug("Error: ", error);
      }
    },
    logoUrl(value: "dark" | "white") {
      if (value === "dark" && this.lightThemeUrl) {
        return this.lightThemeUrl;
      } else if (value === "white" && this.darkThemeUrl) {
        return this.darkThemeUrl;
      } else {
        return `layout/images/logo-${value}.svg`;
      }
    }
  }
});
