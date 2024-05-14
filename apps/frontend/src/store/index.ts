import { ClientInfo } from "@libs/dtos";
import axios from "axios";
import { createStore } from "vuex";

interface RuntimeConfig {
  gaiaXSupport: boolean;
}

export const store = createStore({
  state: {
    user: null as ClientInfo | null,
    settings: null as RuntimeConfig | null,
  },
  getters: {},
  mutations: {
    userInfo(state, payload) {
      state.user = payload;
    },
    config(state, payload: RuntimeConfig) {
      state.settings = payload;
    },
  },
  actions: {
    async login({ commit }, payload) {
      try {
        const response = await axiosInstance.get("/auth/user");
        if (
          response.data.state === "unauthenticated" &&
          payload.redirect === true
        ) {
          window.location.replace("/api/auth/login");
        } else {
          commit("userInfo", response.data.user);
          let settingsResponse = await axiosInstance.get<RuntimeConfig>(
            "/settings"
          );
          commit("config", settingsResponse.data);
        }
      } catch (e) {
        console.log(e);
        throw new Error("Login failed");
      }
    },
    async logout({ commit }) {
      commit("userInfo", null);
      window.location.replace("/api/auth/logout");
    },
    async loadSettings({ commit }) {
      try {
        const response = await axiosInstance.get<RuntimeConfig>("/settings");
        commit("config", response.data);
      } catch (e) {
        console.log(e);
        throw new Error("Could not save runtime configuration");
      }
    },
    async updateSettings({ commit }, payload: RuntimeConfig) {
      try {
        const response = await axiosInstance.post<RuntimeConfig>(
          "/settings/update",
          payload
        );
        commit("config", response.data);
      } catch (e) {
        console.log(e);
        throw new Error("Could not save runtime configuration");
      }
    },
  },
  modules: {},
});

export const axiosInstance = axios.create({
  baseURL: "/api/",
  timeout: 60000,
});
await store.dispatch("login", { redirect: false });
