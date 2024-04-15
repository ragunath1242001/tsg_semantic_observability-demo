import axios from "axios";
import { createStore } from "vuex";

export const store = createStore({
  state: {
    user: null,
  },
  getters: {},
  mutations: {
    userInfo(state, payload) {
      state.user = payload;
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
  },
  modules: {},
});

export const axiosInstance = axios.create({
  baseURL: "/api/",
  timeout: 60000,
});
await store.dispatch("login", { redirect: false });
// axiosInstance.interceptors.request.use(async (config) => {
//   if (
//     !config.headers.Authorization &&
//     store.state.username &&
//     store.state.password
//   ) {
//     config.headers.Authorization = `Basic ${btoa(
//       `${store.state.username}:${store.state.password}`
//     )}`;
//   }
//   return config;
// });
