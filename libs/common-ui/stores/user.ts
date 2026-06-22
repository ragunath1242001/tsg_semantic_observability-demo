import { Action, Resource } from "@tsg-dsp/common-dtos";
import { defineStore } from "pinia";

import { canAccessRoute as canAccessRouteHelper } from "../router/route-permissions";
import http from "../utils/http";

export interface User {
  name: string;
  email: string;
  permissions: string[];
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
    canAccessRoute:
      (state) =>
      (action: Action, resource: Resource): boolean =>
        canAccessRouteHelper(
          { action, resource },
          state.user?.permissions ?? []
        )
  },
  actions: {
    async fetchUserInfo() {
      try {
        const response = await http.get<UserInfo>("/auth/user");
        if (response.data.state === "authenticated") {
          this.user = response.data.user;
        }
      } catch (e) {
        console.log(e);
      } finally {
        loadedResolver();
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
        throw new Error("Login failed", { cause: e });
      }
    },
    async logout() {
      this.user = null;
      window.location.replace("api/auth/logout");
    }
  }
});
