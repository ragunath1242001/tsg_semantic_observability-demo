import { updateColorPalette } from "@tsg-dsp/common-ui/utils/color";
import http from "@tsg-dsp/common-ui/utils/http";
import { AxiosResponse } from "axios";
import { defineStore } from "pinia";

export type AnalyticsDataPlaneMode = "standalone" | "client" | "server";

interface RuntimeStore {
  color?: string;
  darkThemeUrl?: string;
  lightThemeUrl?: string;
  requireProjectAgreement?: boolean;
  jobRefreshIntervalMs?: number;
  mode?: AnalyticsDataPlaneMode;
  loaded?: boolean;
}

export const useRuntimeStore = defineStore("runtime", {
  state: (): RuntimeStore => ({
    color: undefined,
    darkThemeUrl: undefined,
    lightThemeUrl: undefined,
    requireProjectAgreement: false,
    jobRefreshIntervalMs: 10000,
    mode: "standalone",
    loaded: false
  }),
  getters: {
    isClientMode: (state) => state.mode === "client",
    isServerMode: (state) => state.mode === "server",
    isStandaloneMode: (state) => state.mode === "standalone"
  },
  actions: {
    async getRuntimeSettings() {
      try {
        const [settingsResponse, modeResponse] = await Promise.all([
          http.get<RuntimeStore>("/settings"),
          http.get<{ mode: AnalyticsDataPlaneMode }>("/settings/mode")
        ]);

        const response = settingsResponse;
        this.color = response.data.color;
        this.darkThemeUrl = response.data.darkThemeUrl;
        this.lightThemeUrl = response.data.lightThemeUrl;
        this.requireProjectAgreement =
          response.data.requireProjectAgreement ?? false;
        this.jobRefreshIntervalMs = response.data.jobRefreshIntervalMs ?? 10000;

        this.mode = modeResponse.data.mode ?? "standalone";
        this.loaded = true;
      } catch (error) {
        console.debug("Error: ", error);
        this.mode = this.mode ?? "standalone";
        this.loaded = true;
      }
    },
    async ensureLoaded() {
      if (this.loaded) return;
      await this.getRuntimeSettings();
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
