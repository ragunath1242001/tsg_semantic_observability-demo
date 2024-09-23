import { TransferDto } from "@tsg-dsp/http-data-plane-dtos";
import { CatalogDto } from "@tsg-dsp/common-dsp";
import axios from "axios";
import { createStore } from "vuex";

export const store = createStore<{
  user?: {
    sub: string;
    name: string;
    email: string;
    roles: string[];
  };
  title: string;
  transfer?: TransferDto;
  catalog?: CatalogDto;
}>({
  state: {
    user: null,
    title: "",
    transfer: null,
    catalog: null,
  },
  getters: {},
  mutations: {
    userInfo(state, payload) {
      state.user = payload;
    },
    currentTransfer(state, payload) {
      state.transfer = payload;
    },
    catalog(state, payload) {
      state.catalog = payload;
    },
  },
  actions: {
    async login({ commit, dispatch }, payload) {
      try {
        const response = await axiosInstance.get("/auth/user");
        if (
          response.data.state === "unauthenticated" &&
          payload.redirect === true
        ) {
          window.location.replace("api/auth/login");
        } else {
          commit("userInfo", response.data.user);
          dispatch("getCatalog");
        }
      } catch (e) {
        console.log(e);
        throw new Error("Login failed");
      }
    },
    async getCatalog({ commit }) {
      try {
        const response = await axiosInstance.get<CatalogDto>(
          "/management/catalog"
        );
        commit("catalog", response.data);
        if (response.data?.["dct:title"]) {
          const title = `HTTP Data Plane - ${response.data?.["dct:title"]}`;
          window.document.title = title;
          this.state.title = title;
        }
      } catch (e) {
        console.log(e);
      }
    },
    async logout({ commit }) {
      commit("userInfo", null);
      window.location.replace("api/auth/logout");
    },
  },
  modules: {},
});

export const axiosInstance = axios.create({
  baseURL: "api/",
  timeout: 60000,
});
await store.dispatch("login", { redirect: false });
