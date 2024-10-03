import { defineStore, Store } from "pinia";
import http from "../utils/http";

export interface User {
  name: string;
  email: string;
  roles: string[];
  sub: string;
  didId?: string;
}

export interface UserStore {
  user: User | null;
  returnUrl: string | null;
}

export const useUserStore = defineStore("user", {
  state: (): UserStore => ({
    user: null,
    returnUrl: null,
  }),
  actions: {
    hasRole(...roles: string[]) {
      if (!this.user) {
        return false;
      }
      return roles.some((role) => this.user.roles.includes(role));
    },
    async login(payload: { redirect?: boolean }) {
      try {
        const response = await http.get<{ state: string; user: User }>(
          "/auth/user"
        );
        if (
          response.data.state === "unauthenticated" &&
          payload.redirect === true
        ) {
          window.location.replace("api/auth/login");
        } else {
          this.user = response.data.user;
          window.location.hash = `#${this.returnUrl || "/"}`;
        }
      } catch (e) {
        console.log(e);
        throw new Error("Login failed");
      }
    },
    async logout() {
      this.user = null;
      window.location.replace("api/auth/logout");
    },
  },
});
