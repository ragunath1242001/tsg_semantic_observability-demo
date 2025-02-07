import { defineStore } from "pinia";
import http from "../utils/http";
import router from "../router";

interface UserStore {
  user: {
    name: string;
    email: string;
    roles: [];
    sub: string;
  } | null;
  returnUrl: string;
}

export const useUserStore = defineStore("user", {
  state: (): UserStore => ({
    user: {
      name: "",
      email: "",
      roles: [],
      sub: ""
    },
    returnUrl: ""
  }),
  getters: {},
  actions: {
    async login(payload: { redirect: boolean }) {
      try {
        const response = await http.get("/auth/user");
        if (
          response.data.state === "unauthenticated" &&
          payload.redirect === true
        ) {
          window.location.replace("api/auth/login");
        } else {
          this.userInfo(response.data.user);
          router.push(this.returnUrl || "/");
        }
      } catch (e) {
        console.log(e);
        throw new Error("Login failed");
      }
    },
    async logout() {
      this.userInfo(null);
      window.location.replace("api/auth/logout");
    },
    userInfo(
      payload: { name: string; email: string; roles: []; sub: string } | null
    ) {
      this.user = payload;
    }
  }
});
