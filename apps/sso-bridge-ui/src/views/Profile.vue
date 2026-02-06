<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";

import { useWebAuthn } from "../composables/useWebAuthn";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";

const http = injectStrict(AxiosKey);
const toast = useToast();
const { registerCredential } = useWebAuthn(http);

const profile = ref({
  username: "",
  email: "",
  permissions: [],
  require2FA: false,
  has2FA: false
});

const passwordForm = ref({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});

const twoFactorQRCode = ref("");
const twoFactorSecret = ref("");
const twoFactorToken = ref("");
const show2FASetup = ref(false);
const disablePassword = ref("");
const showDisable2FADialog = ref(false);
const resetPassword = ref("");
const showReset2FADialog = ref(false);

// WebAuthn state
const webAuthnCredentials = ref<any[]>([]);
const showAddPasskeyDialog = ref(false);
const passkeyDeviceName = ref("");
const showRecoveryCodes = ref(false);
const recoveryCodes = ref<string[]>([]);

// TOTP Authenticator state
const totpCredentials = ref<any[]>([]);
const showAddTotpDialog = ref(false);
const totpDeviceName = ref("");
const totpSetupQRCode = ref("");
const totpSetupSecret = ref("");
const totpVerifyToken = ref("");
const pendingTotpCredentialId = ref<number | null>(null);

const isAdmin = computed(() => {
  return (
    profile.value.permissions.includes("manage:user") ||
    profile.value.permissions.includes("manage:client")
  );
});

const loadProfile = async () => {
  try {
    const response = await http.get("/profile");
    profile.value = response.data;

    // Load WebAuthn credentials if 2FA is enabled
    if (profile.value.has2FA) {
      loadWebAuthnCredentials();
      loadTotpCredentials();
    }
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error",
        defaultMessage: "Failed to load profile"
      })
    );
  }
};

const changePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "New passwords do not match",
      life: 3000
    });
    return;
  }

  try {
    await http.patch("/profile/password", {
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    });

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Password changed successfully",
      life: 3000
    });

    // Reset form
    passwordForm.value = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    };
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error changing password",
        defaultMessage:
          "Failed to change password. Please check your current password."
      })
    );
  }
};

const enable2FA = async () => {
  try {
    await http.post("/auth/totp/enable");

    // Load QR code and secret
    const qrResponse = await http.get("/auth/totp/profile/qr");
    twoFactorQRCode.value = qrResponse.data.qrCode;

    const secretResponse = await http.get("/auth/totp/profile/secret");
    twoFactorSecret.value = secretResponse.data.secret;

    show2FASetup.value = true;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to enable 2FA",
        defaultMessage: "Failed to enable 2FA"
      })
    );
  }
};

const verify2FASetup = async () => {
  try {
    await http.post("/auth/totp/profile/verify", {
      token: twoFactorToken.value
    });

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "2FA enabled successfully",
      life: 3000
    });

    show2FASetup.value = false;
    twoFactorToken.value = "";
    await loadProfile();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error verifying 2FA",
        defaultMessage: "Failed to verify 2FA token"
      })
    );
  }
};

const openDisable2FADialog = () => {
  disablePassword.value = "";
  showDisable2FADialog.value = true;
};

const disable2FA = async () => {
  try {
    await http.delete("/auth/totp/disable", {
      data: { password: disablePassword.value }
    });

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "2FA disabled successfully",
      life: 3000
    });

    showDisable2FADialog.value = false;
    disablePassword.value = "";
    await loadProfile();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error disabling 2FA",
        defaultMessage: "Failed to disable 2FA. Please check your password."
      })
    );
  }
};

const openReset2FADialog = () => {
  resetPassword.value = "";
  showReset2FADialog.value = true;
};

const reset2FA = async () => {
  try {
    await http.post("/auth/totp/reset", {
      password: resetPassword.value
    });

    toast.add({
      severity: "success",
      summary: "Success",
      detail:
        "2FA has been reset. You will need to set it up again on your next login.",
      life: 4000
    });

    showReset2FADialog.value = false;
    resetPassword.value = "";
    await loadProfile();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error resetting 2FA",
        defaultMessage: "Failed to reset 2FA. Please check your password."
      })
    );
  }
};
// WebAuthn functions
const loadWebAuthnCredentials = async () => {
  try {
    const response = await http.get("/auth/webauthn/credentials");
    webAuthnCredentials.value = response.data.credentials || [];
  } catch (error) {
    console.error("Failed to load WebAuthn credentials", error);
  }
};

const addPasskey = async () => {
  try {
    if (!passkeyDeviceName.value) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "Device name is required",
        life: 3000
      });
      return;
    }
    const result = await registerCredential(passkeyDeviceName.value);

    // Check if recovery codes were returned (initial 2FA setup)
    if (result.recoveryCodes) {
      recoveryCodes.value = result.recoveryCodes;
      showRecoveryCodes.value = true;
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
        detail: "Passkey added successfully",
        life: 3000
      });
    }

    showAddPasskeyDialog.value = false;
    passkeyDeviceName.value = "";
    await loadWebAuthnCredentials();
    await loadProfile();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Error",
        defaultMessage: "Failed to add passkey. Please try again."
      })
    );
  }
};

const deletePasskey = async (credentialId: number) => {
  try {
    await http.post(`/auth/webauthn/credentials/${credentialId}/delete`, {
      id: credentialId
    });

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Passkey deleted successfully",
      life: 3000
    });

    await loadWebAuthnCredentials();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to delete passkey",
        defaultMessage: "Failed to delete passkey"
      })
    );
  }
};

const regenerateRecoveryCodes = async () => {
  try {
    const response = await http.post<{ recoveryCodes: string[] }>(
      "/auth/recovery-codes/regenerate"
    );
    recoveryCodes.value = response.data.recoveryCodes;
    showRecoveryCodes.value = true;

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "New recovery codes generated",
      life: 3000
    });
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to generate recovery codes",
        defaultMessage: "Failed to generate recovery codes"
      })
    );
  }
};

const downloadRecoveryCodes = () => {
  if (!recoveryCodes.value.length) return;

  const content = `SSO Bridge Recovery Codes\n\nSave these codes in a safe place. Each code can only be used once.\n\n${recoveryCodes.value.join("\\n")}\n\nGenerated: ${new Date().toLocaleString()}\nBy: ${window.location.origin}\n`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sso-bridge-recovery-codes.txt";
  a.click();
  window.URL.revokeObjectURL(url);
};

// TOTP Authenticator functions
const loadTotpCredentials = async () => {
  try {
    const response = await http.get("/auth/totp/credentials");
    totpCredentials.value =
      response.data.credentials?.filter((c) => c.isVerified) || [];
  } catch (error) {
    console.error("Failed to load TOTP credentials", error);
  }
};

const initiateTotpSetup = async () => {
  try {
    const response = await http.post<{
      credentialId: number;
      secret: string;
      qrCode: string;
    }>("/auth/totp/register/initiate");

    pendingTotpCredentialId.value = response.data.credentialId;
    totpSetupSecret.value = response.data.secret;
    totpSetupQRCode.value = response.data.qrCode;
    totpVerifyToken.value = "";
    showAddTotpDialog.value = true;
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to initiate TOTP setup",
        defaultMessage: "Failed to initiate TOTP setup. Please try again."
      })
    );
  }
};

const completeTotpSetup = async () => {
  try {
    const response = await http.post<{
      success: boolean;
      recoveryCodes?: string[];
    }>("/auth/totp/register/complete", {
      token: totpVerifyToken.value,
      deviceName: totpDeviceName.value || "TOTP Authenticator"
    });

    if (response.data.recoveryCodes) {
      recoveryCodes.value = response.data.recoveryCodes;
      showRecoveryCodes.value = true;
    }

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "TOTP authenticator registered successfully",
      life: 3000
    });

    showAddTotpDialog.value = false;
    totpDeviceName.value = "";
    totpVerifyToken.value = "";
    pendingTotpCredentialId.value = null;
    await loadTotpCredentials();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to verify TOTP token",
        defaultMessage: "Invalid token. Please try again."
      })
    );
  }
};

const deleteTotpCredential = async (credentialId: number) => {
  try {
    await http.post(`/auth/totp/credentials/${credentialId}/delete`, {
      id: credentialId
    });

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "TOTP authenticator deleted successfully",
      life: 3000
    });

    await loadTotpCredentials();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to delete TOTP authenticator",
        defaultMessage: "Failed to delete TOTP authenticator"
      })
    );
  }
};

onMounted(() => {
  loadProfile();
});
</script>

<template>
  <Card
    class="col-span-12 mb-5"
    style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>Profile</template>
    <template #subtitle>
      In this component you can view and update your profile information, change
      your password, and manage two-factor authentication (2FA) settings.
    </template>
    <template #content>
      <div class="flex flex-col gap-4">
        <FormField label="Username">
          {{ profile.username }}
        </FormField>
        <FormField label="Email">
          {{ profile.email }}
        </FormField>
        <FormField label="Permissions">
          <div class="flex flex-wrap gap-2">
            <Tag
              v-for="perm in profile.permissions"
              :key="perm"
              :value="perm" />
          </div>
        </FormField>
      </div>
    </template>
  </Card>
  <Card
    class="col-span-12 mb-5"
    style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>Two-Factor Authentication (2FA)</template>
    <template #content>
      <div class="mb-3">
        <p class="text-muted-color">
          Two-factor authentication adds an extra layer of security to your
          account.
        </p>
        <div class="flex align-items-center gap-2 mt-3">
          <i
            :class="
              profile.has2FA
                ? 'pi pi-check-circle text-green-500'
                : 'pi pi-times-circle text-red-500'
            "
            style="font-size: 1.5rem"></i>
          <span class="font-medium">
            {{ profile.has2FA ? "2FA is enabled" : "2FA is disabled" }}
          </span>
        </div>
      </div>

      <Button
        v-if="!profile.has2FA"
        label="Enable 2FA"
        icon="pi pi-shield"
        @click="enable2FA" />
      <div v-else class="flex gap-2">
        <Button
          label="Reset 2FA"
          icon="pi pi-refresh"
          severity="warning"
          @click="openReset2FADialog" />
        <Button
          v-if="isAdmin"
          label="Disable 2FA"
          icon="pi pi-shield"
          severity="danger"
          @click="openDisable2FADialog" />
      </div>
    </template>
  </Card>

  <!-- Passkeys Card -->
  <Card
    v-if="profile.has2FA"
    class="col-span-12 mb-5"
    style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>Passkeys (WebAuthn)</template>
    <template #content>
      <div class="mb-4">
        <p class="text-muted-color mb-3">
          Passkeys provide a secure and convenient way to authenticate using
          biometrics or security keys.
        </p>
        <Button
          label="Add New Passkey"
          icon="pi pi-plus"
          @click="showAddPasskeyDialog = true" />
      </div>

      <div v-if="webAuthnCredentials.length > 0" class="mt-4">
        <h3 class="font-semibold mb-3 text-base">Your Registered Passkeys</h3>
        <DataTable :value="webAuthnCredentials" striped-rows>
          <Column field="deviceName" header="Device Name"></Column>
          <Column field="createdDate" header="Created">
            <template #body="slotProps">
              {{ new Date(slotProps.data.createdDate).toLocaleDateString() }}
            </template>
          </Column>
          <Column field="lastUsed" header="Last Used">
            <template #body="slotProps">
              {{ new Date(slotProps.data.lastUsed).toLocaleDateString() }}
            </template>
          </Column>
          <Column header="Actions">
            <template #body="slotProps">
              <Button
                icon="pi pi-trash"
                severity="danger"
                size="small"
                text
                @click="deletePasskey(slotProps.data.id)" />
            </template>
          </Column>
        </DataTable>
      </div>
      <div v-else class="text-muted-color mt-4">
        No passkeys registered yet.
      </div>
    </template>
  </Card>

  <!-- TOTP Authenticators Card -->
  <Card
    v-if="profile.has2FA"
    class="col-span-12 mb-5"
    style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>TOTP Authenticators</template>
    <template #content>
      <div class="mb-4">
        <p class="text-muted-color mb-3">
          TOTP authenticators generate time-based one-time passwords for secure
          two-factor authentication.
        </p>
        <Button
          label="Add New Authenticator"
          icon="pi pi-plus"
          @click="initiateTotpSetup" />
      </div>

      <div v-if="totpCredentials.length > 0" class="mt-4">
        <h3 class="font-semibold mb-3">Your Registered Authenticators</h3>
        <DataTable :value="totpCredentials" striped-rows>
          <Column field="deviceName" header="Device Name"></Column>
          <Column field="isVerified" header="Status">
            <template #body="slotProps">
              <Tag
                :value="slotProps.data.isVerified ? 'Verified' : 'Pending'"
                :severity="slotProps.data.isVerified ? 'success' : 'warning'" />
            </template>
          </Column>
          <Column field="createdDate" header="Created">
            <template #body="slotProps">
              {{ new Date(slotProps.data.createdDate).toLocaleDateString() }}
            </template>
          </Column>
          <Column field="lastUsed" header="Last Used">
            <template #body="slotProps">
              {{
                slotProps.data.lastUsed
                  ? new Date(slotProps.data.lastUsed).toLocaleDateString()
                  : "Never"
              }}
            </template>
          </Column>
          <Column header="Actions">
            <template #body="slotProps">
              <Button
                icon="pi pi-trash"
                severity="danger"
                size="small"
                text
                @click="deleteTotpCredential(slotProps.data.id)" />
            </template>
          </Column>
        </DataTable>
      </div>
      <div v-else class="text-muted-color mt-4">
        No authenticators registered yet.
      </div>
    </template>
  </Card>

  <!-- Recovery Codes Card -->
  <Card
    v-if="profile.has2FA"
    class="col-span-12 mb-5"
    style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>Recovery Codes</template>
    <template #content>
      <div class="mb-3">
        <p class="text-muted-color mb-4">
          Recovery codes can be used to access your account if you lose access
          to your authenticator app or passkey.
        </p>
        <Button
          label="Generate New Recovery Codes"
          icon="pi pi-refresh"
          severity="warning"
          @click="regenerateRecoveryCodes" />
      </div>
    </template>
  </Card>

  <!-- Change Password Card -->
  <Card
    class="col-span-12 mb-5"
    style="border-radius: 12px; border: 1px solid var(--surface-border)">
    <template #title>Change Password</template>
    <template #content>
      <form @submit.prevent="changePassword">
        <div class="flex flex-col gap-4">
          <FormField label="Current Password">
            <Password
              id="currentPassword"
              v-model="passwordForm.currentPassword"
              :feedback="false"
              toggle-mask
              fluid />
          </FormField>
          <FormField label="New Password">
            <Password
              id="newPassword"
              v-model="passwordForm.newPassword"
              toggle-mask
              fluid />
          </FormField>
          <FormField label="Confirm New Password">
            <Password
              id="confirmPassword"
              v-model="passwordForm.confirmPassword"
              :feedback="false"
              toggle-mask
              fluid />
          </FormField>
          <FormField no-label>
            <Button type="submit" label="Change Password" />
          </FormField>
        </div>
      </form>
    </template>
  </Card>

  <!-- 2FA Setup Dialog -->
  <Dialog
    v-model:visible="show2FASetup"
    modal
    header="Set Up Two-Factor Authentication"
    :style="{ width: '30rem' }">
    <div class="text-center">
      <p class="text-muted-color mb-4">
        Scan this QR code with your authenticator app (e.g., Google
        Authenticator, Authy)
      </p>
      <div class="flex justify-center mb-4">
        <img
          v-if="twoFactorQRCode"
          :src="twoFactorQRCode"
          alt="2FA QR Code"
          class="border-2 border-surface-300 rounded-lg" />
      </div>
      <div v-if="twoFactorSecret" class="mb-4">
        <p class="text-muted-color text-sm mb-2">
          Or enter this code manually:
        </p>
        <div
          class="bg-surface-100 dark:bg-surface-800 p-3 rounded border border-surface-300 dark:border-surface-700">
          <code
            class="text-surface-900 dark:text-surface-0 font-mono text-sm break-all"
            >{{ twoFactorSecret }}</code
          >
        </div>
      </div>
      <div class="field">
        <label for="2fa-token"
          >Enter the 6-digit code from your authenticator app</label
        >
        <InputText
          id="2fa-token"
          v-model="twoFactorToken"
          type="text"
          placeholder="000000"
          maxlength="6"
          class="w-full" />
      </div>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        icon="pi pi-times"
        text
        @click="show2FASetup = false" />
      <Button
        label="Verify & Enable"
        icon="pi pi-check"
        :disabled="!twoFactorToken || twoFactorToken.length !== 6"
        @click="verify2FASetup" />
    </template>
  </Dialog>

  <!-- Disable 2FA Dialog -->
  <Dialog
    v-model:visible="showDisable2FADialog"
    modal
    header="Disable Two-Factor Authentication"
    :style="{ width: '25rem' }">
    <div>
      <p class="text-muted-color mb-4">
        Please enter your password to disable two-factor authentication.
      </p>
      <div class="field">
        <label for="disable-password">Password</label>
        <Password
          id="disable-password"
          v-model="disablePassword"
          :feedback="false"
          toggle-mask
          fluid />
      </div>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        icon="pi pi-times"
        text
        @click="showDisable2FADialog = false" />
      <Button
        label="Disable 2FA"
        icon="pi pi-check"
        severity="danger"
        :disabled="!disablePassword"
        @click="disable2FA" />
    </template>
  </Dialog>

  <!-- Reset 2FA Dialog -->
  <Dialog
    v-model:visible="showReset2FADialog"
    modal
    header="Reset Two-Factor Authentication"
    :style="{ width: '25rem' }">
    <div>
      <p class="text-muted-color mb-4">
        Resetting 2FA will remove your current authenticator. You'll need to set
        up 2FA again on your next login.
      </p>
      <div class="field">
        <label for="reset-password">Password</label>
        <Password
          id="reset-password"
          v-model="resetPassword"
          :feedback="false"
          toggle-mask
          fluid />
      </div>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        icon="pi pi-times"
        text
        @click="showReset2FADialog = false" />
      <Button
        label="Reset 2FA"
        icon="pi pi-check"
        severity="warning"
        :disabled="!resetPassword"
        @click="reset2FA" />
    </template>
  </Dialog>

  <!-- Add Passkey Dialog -->
  <Dialog
    v-model:visible="showAddPasskeyDialog"
    modal
    header="Add New Passkey"
    :style="{ width: '30rem' }">
    <div>
      <p class="text-muted-color mb-4">
        Give your passkey a name to help you identify it later (e.g., "iPhone",
        "YubiKey").
      </p>
      <div class="field">
        <label for="passkey-device-name">Device Name</label>
        <InputText
          id="passkey-device-name"
          v-model="passkeyDeviceName"
          required
          placeholder="My Phone"
          class="w-full" />
      </div>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        icon="pi pi-times"
        text
        @click="showAddPasskeyDialog = false" />
      <Button
        label="Register Passkey"
        icon="pi pi-check"
        :disabled="!passkeyDeviceName"
        @click="addPasskey" />
    </template>
  </Dialog>

  <!-- Add TOTP Authenticator Dialog -->
  <Dialog
    v-model:visible="showAddTotpDialog"
    modal
    header="Add TOTP Authenticator"
    :style="{ width: '30rem' }">
    <div class="text-center">
      <p class="text-muted-color mb-4">
        Scan this QR code with your authenticator app (e.g., Google
        Authenticator, Authy, 1Password)
      </p>
      <div class="flex justify-center mb-4">
        <img
          v-if="totpSetupQRCode"
          :src="totpSetupQRCode"
          alt="TOTP QR Code"
          class="border-2 border-surface-300 rounded-lg" />
      </div>
      <div v-if="totpSetupSecret" class="mb-4">
        <p class="text-muted-color text-sm mb-2">
          Or enter this code manually:
        </p>
        <div
          class="bg-surface-100 dark:bg-surface-800 p-3 rounded border border-surface-300 dark:border-surface-700">
          <code
            class="text-surface-900 dark:text-surface-0 font-mono text-sm break-all"
            >{{ totpSetupSecret }}</code
          >
        </div>
      </div>
      <div class="field mb-3">
        <label for="totp-device-name">Device Name (Optional)</label>
        <InputText
          id="totp-device-name"
          v-model="totpDeviceName"
          placeholder="My Phone"
          class="w-full" />
      </div>
      <div class="field">
        <label for="totp-token"
          >Enter the 6-digit code from your authenticator app</label
        >
        <InputText
          id="totp-token"
          v-model="totpVerifyToken"
          type="text"
          placeholder="000000"
          maxlength="6"
          class="w-full" />
      </div>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        icon="pi pi-times"
        text
        @click="showAddTotpDialog = false" />
      <Button
        label="Verify & Add"
        icon="pi pi-check"
        :disabled="!totpVerifyToken || totpVerifyToken.length !== 6"
        @click="completeTotpSetup" />
    </template>
  </Dialog>

  <!-- Recovery Codes Dialog -->
  <Dialog
    v-model:visible="showRecoveryCodes"
    modal
    header="Recovery Codes"
    :style="{ width: '35rem' }">
    <div>
      <div
        class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
        <i
          class="pi pi-exclamation-triangle text-yellow-600 dark:text-yellow-400 text-2xl mb-2"></i>
        <p class="text-yellow-800 dark:text-yellow-200 font-semibold mb-2">
          Important: Save these codes now!
        </p>
        <p class="text-yellow-700 dark:text-yellow-300 text-sm">
          Each code can only be used once. Your old recovery codes are now
          invalid.
        </p>
      </div>
      <div
        class="bg-surface-100 dark:bg-surface-800 p-4 rounded border border-surface-300 dark:border-surface-700 mb-4">
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="(code, index) in recoveryCodes"
            :key="index"
            class="bg-surface-0 dark:bg-surface-900 p-3 rounded border border-surface-200 dark:border-surface-800">
            <code
              class="text-surface-900 dark:text-surface-0 font-mono font-semibold"
              >{{ code }}</code
            >
          </div>
        </div>
      </div>
      <Button
        label="Download Codes"
        icon="pi pi-download"
        class="w-full"
        severity="secondary"
        @click="downloadRecoveryCodes" />
    </div>
    <template #footer>
      <Button
        label="Close"
        icon="pi pi-times"
        @click="showRecoveryCodes = false" />
    </template>
  </Dialog>
</template>
