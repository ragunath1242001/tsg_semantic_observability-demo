import { UserDto } from "@tsg-dsp/sso-bridge-dtos";
import { defineStore } from "pinia";

import router from "../router";
import http from "../utils/http";

interface UserStore {
  user: UserDto | false | null;
  returnUrl: string;
}

export const useAuthStore = defineStore("auth", {
  state: (): UserStore => ({
    user: null,
    returnUrl: ""
  }),
  getters: {
    async getUser() {}
  },
  actions: {
    async getUserInfo() {
      try {
        const response = await http.get<{ user: UserDto }>("/auth/user");
        this.user = response.data.user;
      } catch (_) {
        this.user = false;
      }
    },
    async login(username: string, password: string) {
      try {
        const params = new URLSearchParams();
        params.append("username", username);
        params.append("password", password);
        const response = await http.post<UserDto>("/auth/login", params);
        this.user = response.data;
        router.push(this.returnUrl || "/");
      } catch (e) {
        console.log(e);
        throw new Error("Login failed");
      }
    },
    async logout() {
      this.user = null;
      await http.get("auth/logout");
      window.location.replace("/");
    }
  }
});
