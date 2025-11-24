import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AuthClientService, parseNetworkError } from "@tsg-dsp/common-api";
import {
  SignedJwtResponse,
  SignRequestJwt,
  ValidateJWTRequest
} from "@tsg-dsp/common-dtos";
import {
  CredentialOffer,
  CredentialOfferRequest,
  DCPCredentialRequestInitiation
} from "@tsg-dsp/wallet-dtos";
import { AxiosInstance } from "axios";

import { ControlPlaneConfig } from "../config/control-plane-config.js";
import { DataPlaneError } from "../index.js";

/**
 * Service for interacting with the wallet API.
 */
@Injectable()
export class WalletClientService {
  protected readonly logger = new Logger(this.constructor.name);
  protected axiosWallet?: AxiosInstance = undefined;

  constructor(
    authClient: AuthClientService,
    controlPlaneConfig: ControlPlaneConfig
  ) {
    if (controlPlaneConfig.walletEndpoint) {
      this.axiosWallet = authClient.axiosInstance({
        baseURL: controlPlaneConfig.walletEndpoint
      });
    }
  }

  /**
   * Request a JWT signature from the wallet
   * @param signRequest - The sign request parameters
   */
  async requestSignature(
    signRequest: SignRequestJwt
  ): Promise<SignedJwtResponse> {
    if (!this.axiosWallet) {
      throw new DataPlaneError(
        "Wallet endpoint is not configured",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    try {
      const response = await this.axiosWallet.post<SignedJwtResponse>(
        `/management/signature/sign/jwt`,
        signRequest
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(error, `signing request`);
    }
  }

  /**
   * Validate a signed JWT via the wallet
   * @param signedJwt - The signed JWT to validate
   */
  async validateSignature(
    validateRequest: ValidateJWTRequest
  ): Promise<Record<string, unknown>> {
    if (!this.axiosWallet) {
      throw new DataPlaneError(
        "Wallet endpoint is not configured",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    try {
      const response = await this.axiosWallet.post<Record<string, unknown>>(
        `/management/signature/validate/jwt`,
        validateRequest
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(error, `validating signature`);
    }
  }

  /**
   * Create a credential offer in the wallet
   * @param credentialOfferRequest - The credential offer request
   */
  async createOffer(
    credentialOfferRequest: CredentialOfferRequest
  ): Promise<CredentialOffer> {
    if (!this.axiosWallet) {
      throw new DataPlaneError(
        "Wallet endpoint is not configured",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    try {
      const response = await this.axiosWallet.post<CredentialOffer>(
        `/management/issuance/offers`,
        credentialOfferRequest
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(error, `creating credential offer`);
    }
  }

  /**
   * Request a credential offer via DCP
   * @param request - The DCP credential request initiation
   */
  async requestOfferViaDCP(
    request: DCPCredentialRequestInitiation
  ): Promise<void> {
    if (!this.axiosWallet) {
      throw new DataPlaneError(
        "Wallet endpoint is not configured",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    try {
      await this.axiosWallet.post<void>(
        `/management/issuance/request/dcp`,
        request
      );
    } catch (error) {
      throw parseNetworkError(error, `requesting DCP credential`);
    }
  }
}
