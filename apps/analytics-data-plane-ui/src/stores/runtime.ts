import { updateColorPalette } from "@tsg-dsp/common-ui/utils/color";
import http from "@tsg-dsp/common-ui/utils/http";
import { AxiosResponse } from "axios";
import { defineStore } from "pinia";

interface RuntimeStore {
  color?: string;
  darkThemeUrl?: string;
  lightThemeUrl?: string;
  requireProjectAgreement?: boolean;
}

export const useRuntimeStore = defineStore("runtime", {
  state: (): RuntimeStore => ({
    color: undefined,
    darkThemeUrl: undefined,
    lightThemeUrl: undefined,
    requireProjectAgreement: false
  }),
  actions: {
    async getRuntimeSettings() {
      try {
        const response = await http.get<RuntimeStore>("/settings");
        this.color = response.data.color;
        this.darkThemeUrl = response.data.darkThemeUrl;
        this.lightThemeUrl = response.data.lightThemeUrl;
        this.requireProjectAgreement =
          response.data.requireProjectAgreement ?? false;
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
          color: this.color,
          darkThemeUrl: this.darkThemeUrl,
          lightThemeUrl: this.lightThemeUrl
        });

        this.color = response.data.color;
        this.lightThemeUrl = response.data.lightThemeUrl;
        this.darkThemeUrl = response.data.darkThemeUrl;
        updateColorPalette(this.color);
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
