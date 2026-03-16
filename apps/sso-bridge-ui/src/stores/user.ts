import { UserDto } from "@tsg-dsp/sso-bridge-dtos";
import { defineStore } from "pinia";

import router from "../router";
import http from "../utils/http";

interface UserStore {
  user: UserDto | false | null;
  returnUrl: string;
  twoFactorSetupRequired: boolean;
  twoFactorVerificationRequired: boolean;
  pendingUser: { id: number; username: string; email: string } | null;
  recoveryCodes: string[] | null;
  hasTotpCredentials: boolean;
  hasWebAuthnCredentials: boolean;
}

export const useAuthStore = defineStore("auth", {
  state: (): UserStore => ({
    user: null,
    returnUrl: "",
    twoFactorSetupRequired: false,
    twoFactorVerificationRequired: false,
    pendingUser: null,
    recoveryCodes: null,
    hasTotpCredentials: false,
    hasWebAuthnCredentials: false
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
        const response = await http.post<
          | UserDto
          | {
              status: string;
              user: { id: number; username: string; email: string };
              hasTotpCredentials?: boolean;
              hasWebAuthnCredentials?: boolean;
            }
        >("/auth/login", params);

        // Check if 2FA is required
        if (typeof response.data === "object" && "status" in response.data) {
          if (response.data.status === "2fa_setup_required") {
            this.twoFactorSetupRequired = true;
            this.pendingUser = response.data.user;
            this.hasTotpCredentials = false;
            this.hasWebAuthnCredentials = false;
            return;
          } else if (response.data.status === "2fa_required") {
            this.twoFactorVerificationRequired = true;
            this.pendingUser = response.data.user;
            this.hasTotpCredentials = response.data.hasTotpCredentials || false;
            this.hasWebAuthnCredentials =
              response.data.hasWebAuthnCredentials || false;
            return;
          }
        }

        this.user = response.data as UserDto;
        router.push(this.returnUrl || "/");
      } catch (e) {
        console.log(e);
        throw new Error("Login failed", { cause: e });
      }
    },
    async verify2FASetup(token: string) {
      try {
        const params = new URLSearchParams();
        params.append("token", token);
        const response = await http.post<
          UserDto & { recoveryCodes?: string[]; message?: string }
        >("/auth/totp/setup", params);

        // Store recovery codes if returned
        if (response.data.recoveryCodes) {
          this.recoveryCodes = response.data.recoveryCodes;
          // Don't navigate yet - let user save recovery codes first
          this.twoFactorSetupRequired = false;
        } else {
          this.user = response.data;
          this.twoFactorSetupRequired = false;
          this.pendingUser = null;
          router.push(this.returnUrl || "/");
        }
      } catch (e) {
        console.log(e);
        throw new Error("2FA setup verification failed", { cause: e });
      }
    },
    async verify2FA(token: string) {
      try {
        const params = new URLSearchParams();
        params.append("token", token);
        const response = await http.post<UserDto>("/auth/2fa/verify", params);
        this.user = response.data;
        this.twoFactorVerificationRequired = false;
        this.pendingUser = null;
        router.push(this.returnUrl || "/");
      } catch (e) {
        console.log(e);
        throw new Error("2FA verification failed", { cause: e });
      }
    },
    async get2FAQRCode(): Promise<string> {
      try {
        const response = await http.get<{ qrCode: string }>("/auth/totp/qr");
        return response.data.qrCode;
      } catch (e) {
        console.log(e);
        throw new Error("Failed to get 2FA QR code", { cause: e });
      }
    },
    async get2FASecret(): Promise<string> {
      try {
        const response = await http.get<{ secret: string }>(
          "/auth/totp/secret"
        );
        return response.data.secret;
      } catch (e) {
        console.log(e);
        throw new Error("Failed to get 2FA secret", { cause: e });
      }
    },
    async cancel2FASetup() {
      this.twoFactorSetupRequired = false;
      this.twoFactorVerificationRequired = false;
      this.pendingUser = null;
      this.recoveryCodes = null;
      this.hasTotpCredentials = false;
      this.hasWebAuthnCredentials = false;
      await http.get("auth/logout");
    },
    async completeRecoveryCodesAcknowledgment() {
      try {
        const response = await http.post<UserDto>(
          "/auth/recovery-codes/acknowledge"
        );
        this.user = response.data;
        this.recoveryCodes = null;
        this.pendingUser = null;
        router.push(this.returnUrl || "/");
      } catch (e) {
        console.log(e);
        throw new Error("Failed to complete login", { cause: e });
      }
    },
    async logout() {
      this.user = null;
      this.twoFactorSetupRequired = false;
      this.twoFactorVerificationRequired = false;
      this.pendingUser = null;
      this.recoveryCodes = null;
      this.hasTotpCredentials = false;
      this.hasWebAuthnCredentials = false;
      await http.get("auth/logout");
      window.location.replace("/");
    }
  }
});
