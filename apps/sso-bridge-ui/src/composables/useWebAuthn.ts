import type { AxiosInstance } from "axios";
import { useToast } from "primevue/usetoast";

import {
  arrayBufferToBase64url,
  base64urlToArrayBuffer
} from "../utils/webauthn";

export interface WebAuthnRegistrationResult {
  recoveryCodes?: string[];
}

export interface WebAuthnAuthenticationOptions {
  onSuccess?: () => void | Promise<void>;
  onError?: (error: any) => void;
}

/**
 * Composable for WebAuthn registration and authentication flows
 */
export const useWebAuthn = (http: AxiosInstance) => {
  const toast = useToast();

  /**
   * Register a new WebAuthn credential (passkey)
   * @param deviceName - Name for the device/credential
   * @returns Promise with optional recovery codes if this is the initial 2FA setup
   */
  const registerCredential = async (
    deviceName: string
  ): Promise<WebAuthnRegistrationResult> => {
    if (!deviceName.trim()) {
      toast.add({
        severity: "warn",
        summary: "Device name required",
        detail: "Please enter a name for your passkey",
        life: 5000
      });
      throw new Error("Device name is required");
    }

    // Initiate registration
    const response = await http.post<{ options: any }>(
      "/auth/webauthn/register/initiate"
    );
    const publicKeyOptions = response.data.options;

    // Convert base64url strings to ArrayBuffers for WebAuthn API
    const publicKeyCredentialCreationOptions = {
      ...publicKeyOptions,
      challenge: base64urlToArrayBuffer(publicKeyOptions.challenge),
      user: {
        ...publicKeyOptions.user,
        id: base64urlToArrayBuffer(publicKeyOptions.user.id)
      },
      excludeCredentials: publicKeyOptions.excludeCredentials?.map(
        (cred: any) => ({
          ...cred,
          id: base64urlToArrayBuffer(cred.id)
        })
      )
    };

    // Create credential using browser WebAuthn API
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    })) as any;

    // Convert credential response to JSON format expected by server
    const credentialJSON = {
      id: credential.id,
      rawId: arrayBufferToBase64url(credential.rawId),
      response: {
        attestationObject: arrayBufferToBase64url(
          credential.response.attestationObject
        ),
        clientDataJSON: arrayBufferToBase64url(
          credential.response.clientDataJSON
        ),
        transports: credential.response.getTransports
          ? credential.response.getTransports()
          : []
      },
      type: credential.type,
      clientExtensionResults: credential.getClientExtensionResults(),
      authenticatorAttachment: credential.authenticatorAttachment
    };

    // Complete registration on server
    const result = await http.post<WebAuthnRegistrationResult>(
      "/auth/webauthn/register/complete",
      {
        response: credentialJSON,
        deviceName: deviceName.trim()
      }
    );

    return result.data;
  };

  /**
   * Authenticate using a WebAuthn credential (passkey)
   * @param options - Optional callbacks for success/error handling
   */
  const authenticate = async (
    options?: WebAuthnAuthenticationOptions
  ): Promise<void> => {
    try {
      // Initiate authentication
      const response = await http.post<{ options: any }>(
        "/auth/webauthn/authenticate/initiate"
      );
      const publicKeyOptions = response.data.options;

      // Convert base64url strings to ArrayBuffers
      const publicKeyCredentialRequestOptions = {
        ...publicKeyOptions,
        challenge: base64urlToArrayBuffer(publicKeyOptions.challenge),
        allowCredentials: publicKeyOptions.allowCredentials?.map(
          (cred: any) => ({
            ...cred,
            id: base64urlToArrayBuffer(cred.id)
          })
        )
      };

      // Get credential using browser WebAuthn API
      const credential = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      })) as any;

      // Convert credential response to JSON format
      const credentialJSON = {
        id: credential.id,
        rawId: arrayBufferToBase64url(credential.rawId),
        response: {
          authenticatorData: arrayBufferToBase64url(
            credential.response.authenticatorData
          ),
          clientDataJSON: arrayBufferToBase64url(
            credential.response.clientDataJSON
          ),
          signature: arrayBufferToBase64url(credential.response.signature),
          userHandle: credential.response.userHandle
            ? arrayBufferToBase64url(credential.response.userHandle)
            : null
        },
        type: credential.type
      };

      // Complete authentication on server
      await http.post("/auth/webauthn/authenticate/complete", {
        response: credentialJSON
      });

      if (options?.onSuccess) {
        await options.onSuccess();
      }
    } catch (error) {
      console.error("WebAuthn authentication error:", error);

      if (options?.onError) {
        options.onError(error);
      } else {
        toast.add({
          severity: "error",
          summary: "Error",
          detail:
            "WebAuthn authentication failed. Please use TOTP or recovery code instead.",
          life: 5000
        });
      }

      throw error;
    }
  };

  return {
    registerCredential,
    authenticate
  };
};
