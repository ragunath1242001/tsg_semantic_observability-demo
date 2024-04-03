import axios from "axios";
import { createStore } from "vuex";

export const store = createStore({
  state: {
    username: localStorage.getItem("username") as string | null,
    password: localStorage.getItem("password") as string | null,
  },
  getters: {},
  mutations: {
    credentialUpdate(state, payload) {
      state.username = payload.username;
      state.password = payload.password;
    },
  },
  actions: {
    async login({ commit }, payload) {
      try {
        const response = await axiosInstance.get("/management/state", {
          headers: {
            Authorization: `Basic ${btoa(
              `${payload.username}:${payload.password}`
            )}`,
          },
        });
        localStorage.setItem("username", payload.username);
        localStorage.setItem("password", payload.password);
        commit("credentialUpdate", payload);
      } catch (e) {
        console.log(e);
        throw new Error("Login failed");
      }
    },
    async logout({ commit }) {
      localStorage.removeItem("username");
      localStorage.removeItem("password");
      commit("credentialUpdate", {
        access_token: null,
        refresh_token: null,
      });
    },
  },
  modules: {},
});

export const axiosInstance = axios.create({
  baseURL: "/api/",
  timeout: 60000,
});
axiosInstance.interceptors.request.use(async (config) => {
  if (
    !config.headers.Authorization &&
    store.state.username &&
    store.state.password
  ) {
    config.headers.Authorization = `Basic ${btoa(
      `${store.state.username}:${store.state.password}`
    )}`;
  }
  return config;
});
