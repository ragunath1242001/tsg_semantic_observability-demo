import { defineStore } from "pinia";

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
  loaded: Promise<void>;
}

export interface UserInfo {
  state: "authenticated" | "unauthenticated";
  user: User;
}

let loadedResolver: () => void;

export const useUserStore = defineStore("user", {
  state: (): UserStore => ({
    loaded: new Promise<void>((resolve) => {
      loadedResolver = resolve;
    }),
    user: null,
    returnUrl: null
  }),
  getters: {
    isReadOnly: (state) => {
      if (!state.user) {
        return false;
      }
      return (
        state.user.roles.length === 1 &&
        state.user.roles.includes("readonly_user")
      );
    }
  },
  actions: {
    hasRole(...roles: string[]) {
      if (!this.user) {
        return false;
      }
      return roles.some((role) => this.user.roles.includes(role));
    },
    async fetchUserInfo() {
      try {
        const response = await http.get<UserInfo>("/auth/user");
        if (response.data.state === "authenticated") {
          this.user = response.data.user;
        }
        loadedResolver();
      } catch (e) {
        console.log(e);
        throw new Error("Login failed");
      }
    },
    async login() {
      try {
        const response = await http.get<UserInfo>("/auth/user");
        if (response.data.state === "unauthenticated") {
          window.location.replace("api/auth/login");
        } else {
          this.user = response.data.user;
        }
      } catch (e) {
        console.log(e);
        throw new Error("Login failed");
      }
    },
    async logout() {
      this.user = null;
      window.location.replace("api/auth/logout");
    }
  }
});
