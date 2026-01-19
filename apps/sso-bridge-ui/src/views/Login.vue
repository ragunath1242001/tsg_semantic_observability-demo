<script setup lang="ts">
import FloatingConfigurator from "@tsg-dsp/common-ui/components/FloatingConfigurator.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout.js";
import { toastError } from "@tsg-dsp/common-ui/utils/error.js";
import { useToast } from "primevue";
import QRCode from "qrcode";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import RecoveryCodesDisplay from "../components/RecoveryCodesDisplay.vue";
import { useWebAuthn } from "../composables/useWebAuthn";
import router from "../router";
import { useAuthStore } from "../stores/user";
import http from "../utils/http";

const { layoutConfig } = useLayout();

const logoUrl = computed(() => {
  return `layout/images/${
    layoutConfig.darkTheme ? "logo-white" : "logo-dark"
  }.svg`;
});

const route = useRoute();
const authorizationRequest = ref<Record<string, string>>(null);

if (route.query.response_type) {
  authorizationRequest.value = Object.fromEntries(
    Object.entries(route.query).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value
    ])
  );
}

const toast = useToast();

const store = useAuthStore();
const { registerCredential, authenticate: authenticateWebAuthn } =
  useWebAuthn(http);

const username = ref("");
const password = ref("");
const twoFactorToken = ref("");
const qrCodeData = ref("");
const manualSecret = ref("");
const webAuthnSelected = ref(false);
const setupMethod = ref<"totp" | "passkey">("totp"); // For initial 2FA setup
const passkeyDeviceName = ref(""); // For passkey registration during setup

const login = async (currentUser: boolean = false) => {
  try {
    if (authorizationRequest.value) {
      if (currentUser) {
        // User already logged in, proceed with OAuth
        const response = await http.post<{ url: string }>(
          "/oauth/login",
          {},
          {
            params: {
              redirect: false,
              ...authorizationRequest.value
            }
          }
        );
        window.location.replace(response.data.url);
      } else {
        // First check auth with regular login to handle 2FA
        await store.login(username.value, password.value);

        // Check if 2FA setup is required - don't load QR code yet
        if (store.twoFactorSetupRequired) {
          return; // Stay on 2FA setup screen
        } else if (store.twoFactorVerificationRequired) {
          // Check if 2FA verification is required and set default method
          if (store.twoFactorVerificationRequired) {
            webAuthnSelected.value = store.hasWebAuthnCredentials;
          }
          // Stay on 2FA verification screen
          return;
        }

        // No 2FA required or already verified, proceed with OAuth
        const response = await http.post<{ url: string }>(
          "/oauth/login",
          {},
          {
            params: {
              redirect: false,
              ...authorizationRequest.value
            }
          }
        );
        window.location.replace(response.data.url);
      }
    } else {
      if (currentUser) {
        // User already logged in, reload to get user session and redirect to home
        router.push(store.returnUrl || "/");
        return;
      }
      await store.login(username.value, password.value);

      // Check if 2FA verification is required and set default method
      if (store.twoFactorVerificationRequired) {
        webAuthnSelected.value = store.hasWebAuthnCredentials;
      }
    }
  } catch (_) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Invalid credentials",
      life: 5000
    });
  }
};

const verify2FASetup = async () => {
  try {
    await store.verify2FASetup(twoFactorToken.value);

    // Check if recovery codes were returned
    if (store.recoveryCodes && store.recoveryCodes.length > 0) {
      // Recovery codes will be shown in UI
      return;
    }

    // After successful 2FA setup, check if we need to redirect to OAuth
    if (authorizationRequest.value) {
      const response = await http.post<{ url: string }>(
        "/oauth/login",
        {},
        {
          params: {
            redirect: false,
            ...authorizationRequest.value
          }
        }
      );
      window.location.replace(response.data.url);
    }
  } catch (_) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Invalid 2FA token",
      life: 5000
    });
  }
};

const verify2FA = async () => {
  try {
    await store.verify2FA(twoFactorToken.value);

    // After successful 2FA verification, check if we need to redirect to OAuth
    if (authorizationRequest.value) {
      const response = await http.post<{ url: string }>(
        "/oauth/login",
        {},
        {
          params: {
            redirect: false,
            ...authorizationRequest.value
          }
        }
      );
      window.location.replace(response.data.url);
    }
  } catch (_) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Invalid 2FA token or recovery code",
      life: 5000
    });
  }
};

const cancel2FASetup = async () => {
  await store.cancel2FASetup();
  qrCodeData.value = "";
  manualSecret.value = "";
  twoFactorToken.value = "";
  passkeyDeviceName.value = "";
};

const acknowledgeRecoveryCodes = async () => {
  try {
    await store.completeRecoveryCodesAcknowledgment();

    // Check if we need to redirect to OAuth
    if (authorizationRequest.value) {
      const response = await http.post<{ url: string }>(
        "/oauth/login",
        {},
        {
          params: {
            redirect: false,
            ...authorizationRequest.value
          }
        }
      );
      window.location.replace(response.data.url);
    }
  } catch (_) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to complete login",
      life: 5000
    });
  }
};

const authenticateWithWebAuthn = async () => {
  await authenticateWebAuthn({
    onSuccess: async () => {
      // After successful authentication, check if we need to redirect to OAuth
      if (authorizationRequest.value) {
        const response = await http.post<{ url: string }>(
          "/oauth/login",
          {},
          {
            params: {
              redirect: false,
              ...authorizationRequest.value
            }
          }
        );
        window.location.replace(response.data.url);
      } else {
        // Reload to get user session and redirect to home
        await store.getUserInfo();
        window.location.href = "/";
      }
    }
  });
};

const setupPasskey = async () => {
  try {
    const result = await registerCredential(passkeyDeviceName.value);

    // Check if recovery codes were returned (initial setup)
    if (result.recoveryCodes) {
      store.recoveryCodes = result.recoveryCodes;
      toast.add({
        severity: "success",
        summary: "Success",
        detail:
          "Passkey registered successfully. Please save your recovery codes.",
        life: 3000
      });
    } else {
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Passkey registered successfully",
        life: 3000
      });
      // Not initial setup, just refresh user info
      await store.getUserInfo();
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to register passkey",
        defaultMessage:
          "Failed to register passkey. Please try again or use TOTP instead."
      })
    );
  }
};

const id = ref(crypto.randomUUID());

const oid4vpData = ref("");
const oid4vpUrl = ref("");

const createAuthorizationRequest = async (value: string) => {
  if (value === "0") {
    return;
  }
  try {
    const queryString = new URLSearchParams(
      route.query as Record<string, string>
    ).toString();
    const response = await http.get<string>(
      `management/oid4vp/verifier/${id.value}?${queryString}`
    );
    if (response.status == 200) {
      oid4vpUrl.value = response.data;
      oid4vpData.value = await QRCode.toDataURL(response.data);
      setTimeout(getStatus, 1000);
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not get authorization request",
        defaultMessage: `Error in retrieving authorization request`
      })
    );
  }
};

const getStatus = async () => {
  try {
    const response = await http.get(`oid4vp/status/${id.value}`);
    if (response.data.completed) {
      window.location.replace(`api/oid4vp/redirect/${id.value}`);
    } else {
      setTimeout(getStatus, 1000);
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Could not get status",
        defaultMessage: `Error in retrieving status`
      })
    );
  }
};

// Watch for setup method changes and 2FA setup requirement to load TOTP data only when needed
watch(
  [setupMethod, () => store.twoFactorSetupRequired],
  async ([method, setupRequired]) => {
    if (method === "totp" && setupRequired) {
      // Only load QR code and secret if not already loaded
      if (!qrCodeData.value) {
        try {
          qrCodeData.value = await store.get2FAQRCode();
          manualSecret.value = await store.get2FASecret();
        } catch (error) {
          toast.add(
            toastError({
              error,
              summary: "Error",
              defaultMessage: "Failed to load TOTP setup data"
            })
          );
        }
      }
    }
  },
  { immediate: true }
);
</script>

<template>
  <FloatingConfigurator />
  <div
    class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen -mt-11 overflow-hidden">
    <div class="flex flex-col items-center justify-center">
      <div
        style="
          border-radius: 56px;
          padding: 0.3rem;
          background: linear-gradient(
            180deg,
            var(--primary-color) 10%,
            rgba(33, 150, 243, 0) 30%
          );
        ">
        <div
          class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20"
          style="border-radius: 53px">
          <div class="text-center mb-8">
            <img :src="logoUrl" class="mb-6 w-40 shrink-0 mx-auto" alt="logo" />
            <div
              class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">
              Welcome to the SSO Bridge!
            </div>
            <span v-if="!store.user" class="text-muted-color font-medium"
              >Sign in to continue</span
            >
          </div>
          <div v-if="store.user" class="text-center mb-4">
            <span class="text-muted-color font-medium">Continue as:</span>
            <Button
              :label="`${store.user.username}`"
              class="w-full mt-3 mb-6"
              severity="info"
              @click="login(true)"></Button>
            <span class="text-muted-color font-medium"
              >Or sign in with a different account:</span
            >
          </div>

          <!-- 2FA Setup Screen -->
          <div
            v-if="store.twoFactorSetupRequired && !store.recoveryCodes"
            class="text-center">
            <div
              class="text-surface-900 dark:text-surface-0 text-2xl font-medium mb-4">
              Set Up Two-Factor Authentication
            </div>

            <!-- Toggle between TOTP and Passkey setup -->
            <div class="flex justify-center gap-2 mb-6">
              <Button
                label="TOTP (Authenticator App)"
                :severity="setupMethod === 'totp' ? 'primary' : 'secondary'"
                size="small"
                @click="setupMethod = 'totp'" />
              <Button
                label="Passkey (Biometric/Security Key)"
                :severity="setupMethod === 'passkey' ? 'primary' : 'secondary'"
                size="small"
                @click="setupMethod = 'passkey'" />
            </div>

            <!-- TOTP Setup -->
            <div v-if="setupMethod === 'totp'">
              <p class="text-muted-color mb-6">
                Scan this QR code with your authenticator app (e.g., Google
                Authenticator, Authy)
              </p>
              <div class="flex justify-center mb-6">
                <img
                  v-if="qrCodeData"
                  :src="qrCodeData"
                  alt="2FA QR Code"
                  class="border-2 border-surface-300 rounded-lg" />
              </div>
              <div v-if="manualSecret" class="mb-6">
                <p class="text-muted-color text-sm mb-2">
                  Or enter this code manually:
                </p>
                <div
                  class="bg-surface-100 dark:bg-surface-800 p-3 rounded border border-surface-300 dark:border-surface-700">
                  <code
                    class="text-surface-900 dark:text-surface-0 font-mono text-sm break-all"
                    >{{ manualSecret }}</code
                  >
                </div>
              </div>
              <form @submit.prevent="verify2FASetup">
                <label
                  for="2fa-token-setup"
                  class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2"
                  >Enter the 6-digit code from your authenticator app</label
                >
                <InputText
                  id="2fa-token-setup"
                  v-model="twoFactorToken"
                  type="text"
                  placeholder="000000"
                  class="w-full mb-4"
                  maxlength="6" />
                <Button
                  label="Verify & Complete Setup"
                  class="w-full mb-2"
                  type="submit"></Button>
                <Button
                  label="Cancel"
                  class="w-full"
                  severity="secondary"
                  type="button"
                  @click="cancel2FASetup"></Button>
              </form>
            </div>

            <!-- Passkey Setup -->
            <div v-else>
              <p class="text-muted-color mb-6">
                Use your device's biometric sensor (fingerprint, face ID) or a
                hardware security key
              </p>
              <div class="mb-4">
                <label
                  for="passkey-device-name"
                  class="block text-surface-900 dark:text-surface-0 font-medium mb-2"
                  >Device Name</label
                >
                <InputText
                  id="passkey-device-name"
                  v-model="passkeyDeviceName"
                  type="text"
                  placeholder="e.g., My Phone, YubiKey"
                  class="w-full"
                  maxlength="50" />
                <small class="text-muted-color"
                  >Give your passkey a name to help identify it later</small
                >
              </div>
              <Button
                label="Set Up Passkey"
                icon="pi pi-key"
                class="w-full mb-2"
                :disabled="!passkeyDeviceName.trim()"
                @click="setupPasskey"></Button>
              <Button
                label="Cancel"
                class="w-full"
                severity="secondary"
                type="button"
                @click="cancel2FASetup"></Button>
            </div>
          </div>

          <!-- Recovery Codes Display Screen -->
          <div v-else-if="store.recoveryCodes" class="text-center">
            <div
              class="text-surface-900 dark:text-surface-0 text-2xl font-medium mb-4">
              Save Your Recovery Codes
            </div>
            <RecoveryCodesDisplay
              :recovery-codes="store.recoveryCodes"
              @continue="acknowledgeRecoveryCodes" />
          </div>

          <!-- 2FA Verification Screen -->
          <div
            v-else-if="store.twoFactorVerificationRequired"
            class="text-center">
            <div
              class="text-surface-900 dark:text-surface-0 text-2xl font-medium mb-4">
              Two-Factor Authentication
            </div>

            <!-- Toggle between TOTP and WebAuthn -->
            <div class="flex justify-center gap-2 mb-6">
              <Button
                :label="
                  webAuthnSelected
                    ? 'Use Authenticator App or Recovery Code'
                    : 'Use Passkey'
                "
                :icon="webAuthnSelected ? 'pi pi-mobile' : 'pi pi-key'"
                severity="secondary"
                size="small"
                @click="webAuthnSelected = !webAuthnSelected" />
            </div>

            <!-- TOTP / Recovery Code Input -->
            <div v-if="!webAuthnSelected">
              <p class="text-muted-color mb-6">
                Enter the 6-digit code from your authenticator app or use a
                recovery code
              </p>
              <form @submit.prevent="verify2FA">
                <label
                  for="2fa-token"
                  class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2"
                  >Authentication Code or Recovery Code</label
                >
                <InputText
                  id="2fa-token"
                  v-model="twoFactorToken"
                  type="text"
                  placeholder="000000 or XXXX-XXXX"
                  class="w-full mb-4" />
                <Button label="Verify" class="w-full" type="submit"></Button>
              </form>
            </div>

            <!-- WebAuthn -->
            <div v-else>
              <p class="text-muted-color mb-6">
                Use your registered passkey (fingerprint, face ID, or security
                key)
              </p>
              <Button
                label="Authenticate with Passkey"
                icon="pi pi-key"
                class="w-full"
                @click="authenticateWithWebAuthn"></Button>
            </div>
          </div>

          <Tabs v-else value="0" @update:value="createAuthorizationRequest">
            <TabList>
              <Tab value="0">Username/Password</Tab>
              <Tab value="1">TSG Wallet App</Tab>
            </TabList>
            <TabPanels>
              <TabPanel value="0">
                <form @submit.prevent="login(false)">
                  <label
                    for="email1"
                    class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2"
                    >Username</label
                  >
                  <InputText
                    id="email1"
                    v-model="username"
                    type="text"
                    placeholder="Username"
                    class="w-full mb-8" />

                  <label
                    for="password1"
                    class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2"
                    >Password</label
                  >
                  <Password
                    id="password1"
                    v-model="password"
                    placeholder="Password"
                    :toggle-mask="true"
                    class="w-full mb-4"
                    fluid
                    :feedback="false"></Password>

                  <Button label="Sign In" class="w-full" type="submit"></Button>
                </form>
              </TabPanel>
              <TabPanel value="1">
                <div class="flex flex-col items-center justify-center">
                  <div class="text-center mb-4">
                    <span class="text-muted"
                      >Scan the QR code with the TSG Wallet App to sign in</span
                    >
                  </div>
                  <a :href="oid4vpUrl" target="_blank"
                    ><img :src="oid4vpData" alt="QR code"
                  /></a>
                </div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pi-eye {
  transform: scale(1.6);
  margin-right: 1rem;
}

.pi-eye-slash {
  transform: scale(1.6);
  margin-right: 1rem;
}
</style>
