import {
  DIDDocumentDto,
  ServiceDto,
  SignedJwtResponse,
  SignRequestJwt,
  ValidateJWTRequest
} from "@tsg-dsp/common-dtos";
import {
  CredentialOffer,
  CredentialOfferStatus,
  DCPCredentialRequestInitiation,
  KeyInfo
} from "@tsg-dsp/wallet-dtos";

import type { WalletClient } from "../client.js";
import { validateResponse, validateResponseArray } from "../utils/validate.js";

/**
 * Manage cryptographic keys, verifiable credentials, DIDs, and credential
 * issuance through the TSG Wallet.
 *
 * Requires `walletBaseUrl` to be set in the SDK configuration.
 * @example
 * ```ts
 * const keys = await sdk.wallet.listKeys();
 * const did = await sdk.wallet.getDidDocument();
 * const signed = await sdk.wallet.signJwt({ body: payload, audience: "did:web:other" });
 * ```
 */
export class WalletSdk {
  constructor(private readonly client: WalletClient) {}

  // ── Signing ────────────────────────────────────────────────────────────

  /**
   * Request a JWT signature from the wallet using a managed key.
   * @param request - The signing request containing the JWT body, audience, key ID, etc.
   * @returns A validated {@link SignedJwtResponse} containing the signed JWT.
   */
  async signJwt(request: SignRequestJwt) {
    const { data } = await this.client.POST("/management/signature/sign/jwt", {
      body: request
    });
    return validateResponse(SignedJwtResponse, data!);
  }

  /**
   * Validate a JWT using the wallet's key material and trust configuration.
   * @param request - The validation request containing the JWT string to verify.
   * @returns The validation result.
   */
  async validateJwt(request: ValidateJWTRequest) {
    const { data } = await this.client.POST(
      "/management/signature/validate/jwt",
      {
        body: request
      }
    );
    return data!;
  }

  // ── Credentials ────────────────────────────────────────────────────────

  /**
   * List all verifiable credentials stored in the wallet.
   * @returns An array of credential objects.
   */
  async listCredentials() {
    const { data } = await this.client.GET("/management/credentials");
    return data ?? [];
  }

  /**
   * Get a specific verifiable credential by its ID.
   * @param credentialId - The credential identifier.
   * @returns The credential object.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.NOT_FOUND} if the credential does not exist.
   */
  async getCredential(credentialId: string) {
    const { data } = await this.client.GET(
      "/management/credentials/{credentialId}",
      {
        params: { path: { credentialId } }
      }
    );
    return data!;
  }

  /**
   * Delete a verifiable credential from the wallet.
   * @param credentialId - The credential identifier.
   * @returns The deletion response.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.NOT_FOUND} if the credential does not exist.
   */
  async deleteCredential(credentialId: string) {
    const { data } = await this.client.DELETE(
      "/management/credentials/{credentialId}",
      {
        params: { path: { credentialId } }
      }
    );
    return data!;
  }

  /**
   * Revoke a verifiable credential, making it invalid for future verification.
   * @param credentialId - The credential identifier.
   * @returns The revocation response.
   */
  async revokeCredential(credentialId: string) {
    const { data } = await this.client.POST(
      "/management/credentials/{credentialId}/revoke",
      {
        params: { path: { credentialId } }
      }
    );
    return data!;
  }

  /**
   * Get the credential configuration, including trust anchors and issuer settings.
   * @returns The credential configuration object.
   */
  async getCredentialConfig() {
    const { data } = await this.client.GET("/management/credentials/config");
    return data!;
  }

  /**
   * List all dataspace-scoped verifiable credentials.
   *
   * Dataspace credentials are a subset of credentials specifically used
   * for dataspace membership and trust establishment.
   * @returns An array of dataspace credential objects.
   */
  async listDataspaceCredentials() {
    const { data } = await this.client.GET("/management/credentials/dataspace");
    return data ?? [];
  }

  // ── DID Management ─────────────────────────────────────────────────────

  /**
   * Get the DID document of this wallet's identity.
   * @returns A validated {@link DIDDocumentDto}.
   */
  async getDidDocument() {
    const { data } = await this.client.GET("/management/did");
    return validateResponse(DIDDocumentDto, data!);
  }

  /**
   * Get all DID services registered in the DID document.
   * @returns An array of validated {@link ServiceDto} instances.
   */
  async getDidServices() {
    const { data } = await this.client.GET("/management/did/services");
    return validateResponseArray(ServiceDto, data ?? []);
  }

  // ── Key Management ─────────────────────────────────────────────────────

  /**
   * List all cryptographic keys managed by the wallet.
   * @returns An array of validated {@link KeyInfo} instances.
   */
  async listKeys() {
    const { data } = await this.client.GET("/management/keys");
    return validateResponseArray(KeyInfo, data ?? []);
  }

  /**
   * Get a specific key by its ID.
   * @param keyId - The key identifier.
   * @returns A validated {@link KeyInfo}.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.NOT_FOUND} if the key does not exist.
   */
  async getKey(keyId: string) {
    const { data } = await this.client.GET("/management/keys/{keyId}", {
      params: { path: { keyId } }
    });
    return validateResponse(KeyInfo, data!);
  }

  /**
   * Delete a cryptographic key from the wallet.
   * @param keyId - The key identifier.
   * @returns The deletion response.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.NOT_FOUND} if the key does not exist.
   */
  async deleteKey(keyId: string) {
    const { data } = await this.client.DELETE("/management/keys/{keyId}", {
      params: { path: { keyId } }
    });
    return data!;
  }

  /**
   * Set a key as the default signing key for this wallet.
   * @param keyId - The key identifier to make default.
   * @returns The update response.
   */
  async setDefaultKey(keyId: string) {
    const { data } = await this.client.PUT("/management/keys/{keyId}/default", {
      params: { path: { keyId } }
    });
    return data!;
  }

  // ── Issuance ───────────────────────────────────────────────────────────

  /**
   * Create a new credential offer for issuance to another party.
   * @param request - The credential offer details.
   * @returns A validated {@link CredentialOffer}.
   */
  async createOffer(request: CredentialOffer) {
    const { data } = await this.client.POST("/management/issuance/offers", {
      body: request
    });
    return validateResponse(CredentialOffer, data!);
  }

  /**
   * Request a credential offer via the Decentralized Claims Protocol (DCP).
   *
   * This initiates the issuance flow by sending a credential request to
   * a remote issuer using the DCP standard.
   * @param request - The DCP credential request initiation details.
   */
  async requestOfferViaDcp(request: DCPCredentialRequestInitiation) {
    await this.client.POST("/management/issuance/request/dcp", {
      body: request
    });
  }

  /**
   * Get the status and details of a credential offer.
   * @param id - The credential offer identifier.
   * @returns A validated {@link CredentialOfferStatus}.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.NOT_FOUND} if the offer does not exist.
   */
  async getOffer(id: string) {
    const { data } = await this.client.GET("/management/issuance/offers/{id}", {
      params: { path: { id } }
    });
    return validateResponse(CredentialOfferStatus, data!);
  }

  /**
   * Revoke a credential offer, preventing it from being claimed.
   * @param id - The credential offer identifier.
   * @returns The revocation response.
   */
  async revokeOffer(id: string) {
    const { data } = await this.client.PUT(
      "/management/issuance/offers/{id}/revoke",
      {
        params: { path: { id } }
      }
    );
    return data!;
  }
}
