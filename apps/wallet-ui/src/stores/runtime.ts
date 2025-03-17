import http from "@tsg-dsp/common-ui/utils/http";
import { AxiosResponse } from "axios";
import { defineStore } from "pinia";

interface RuntimeStore {
  gaiaXSupport: boolean;
  title?: string;
  acceptUnauthenticatedCredentialRequests?: boolean;
  issueMobileCredentials?: boolean;
  color?: string;
  darkThemeUrl?: string;
  lightThemeUrl?: string;
  loaded?: Promise<void>;
}

let loadedResolver: () => void;

export const useRuntimeStore = defineStore("runtime", {
  state: (): RuntimeStore => ({
    loaded: new Promise<void>((resolve) => {
      loadedResolver = resolve;
    }),
    gaiaXSupport: false,
    title: undefined,
    acceptUnauthenticatedCredentialRequests: undefined,
    issueMobileCredentials: undefined,
    color: undefined,
    darkThemeUrl: undefined,
    lightThemeUrl: undefined
  }),
  actions: {
    async getRuntimeSettings() {
      try {
        const response = await http.get<RuntimeStore>("/settings");
        this.updateStoreFromResponse(response.data);
        loadedResolver();
      } catch (error) {
        console.debug("Error: ", error);
      }
    },

    async updateRuntimeSettings() {
      try {
        const payload: RuntimeStore = {
          gaiaXSupport: this.gaiaXSupport,
          title: this.title,
          acceptUnauthenticatedCredentialRequests:
            this.acceptUnauthenticatedCredentialRequests,
          issueMobileCredentials: this.issueMobileCredentials,
          color: this.color,
          darkThemeUrl: this.darkThemeUrl,
          lightThemeUrl: this.lightThemeUrl
        };

        const response = await http.post<
          RuntimeStore,
          AxiosResponse<RuntimeStore>,
          RuntimeStore
        >("/settings/update", payload);

        this.updateStoreFromResponse(response.data);
      } catch (error) {
        console.debug("Error: ", error);
      }
    },

    updateStoreFromResponse(data: RuntimeStore) {
      this.gaiaXSupport = data.gaiaXSupport;
      this.title = data.title;
      this.acceptUnauthenticatedCredentialRequests =
        data.acceptUnauthenticatedCredentialRequests;
      this.issueMobileCredentials = data.issueMobileCredentials;
      this.color = data.color;
      this.darkThemeUrl = data.darkThemeUrl;
      this.lightThemeUrl = data.lightThemeUrl;
    },

    logoUrl(theme: "dark" | "white"): string {
      if (theme === "dark" && this.lightThemeUrl) {
        return this.lightThemeUrl;
      } else if (theme === "white" && this.darkThemeUrl) {
        return this.darkThemeUrl;
      }
      return `layout/images/logo-${theme}.svg`;
    }
  }
});
