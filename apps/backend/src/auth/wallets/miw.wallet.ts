import { HttpStatus, Logger } from "@nestjs/common";
import axios from "axios";
import qs from "qs";
import { IamConfig } from "../../config";
import { DSPClientError, DSPError } from "../../utils/errors/error";
import { ValidationResult, WalletClient } from "./walletClient";
import { DIDDocument } from "did-resolver";
import jwt from "jsonwebtoken";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentationJwt,
} from "@tsg-dsp/common";

export interface MiWWalletDetails {
  name: string;
  did: string;
  bpn: string;
  algorithm: string;
  didDocument: DIDDocument;
  verifiableCredentials: VerifiableCredential<CredentialSubject>[];
}

export class ManagedIdentityWalletClient extends WalletClient {
  constructor(private readonly iamConfig: IamConfig) {
    super();
  }
  private readonly logger = new Logger(this.constructor.name);
  private access_token?: string;
  private expiration?: Date;

  private async requestAccessToken() {
    const data = qs.stringify({
      client_id: this.iamConfig.clientId,
      client_secret: this.iamConfig.clientSecret,
      grant_type: "client_credentials",
    });
    try {
      const response = await axios.post<{ access_token: string }>(
        this.iamConfig.tokenUrl,
        data,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      this.access_token = response.data.access_token;
      const accessTokenPayload = jwt.decode(this.access_token, { json: true });
      if (accessTokenPayload?.exp) {
        this.expiration = new Date(accessTokenPayload["exp"] * 1000 - 10000);
      }
    } catch (err) {
      throw new DSPClientError(
        "Could not request access token from wallet",
        err
      );
    }
  }

  private async getWallet(): Promise<MiWWalletDetails> {
    if (!this.iamConfig.walletUrl) {
      throw new DSPError(
        "No walletUrl configured for the Managed Identity Wallet",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    try {
      const data = await axios.get<MiWWalletDetails>(this.iamConfig.walletUrl, {
        headers: {
          Authorization: `Bearer ${this.access_token}`,
        },
        params: {
          withCredentials: "true",
        },
      });
      return data.data;
    } catch (err) {
      throw new DSPClientError("Could not request wallet details", err);
    }
  }

  async requestVerifiablePresentation(
    audience: string
  ): Promise<VerifiablePresentationJwt> {
    if (
      !this.access_token ||
      !this.expiration ||
      this.expiration < new Date()
    ) {
      await this.requestAccessToken();
    }
    const walletDetails = await this.getWallet();
    const credential = walletDetails.verifiableCredentials.find(
      (c) => c.id === this.iamConfig.credentialId
    );
    try {
      const response = await axios.post<VerifiablePresentationJwt>(
        this.iamConfig.presentationUrl,
        {
          holderIdentifier: walletDetails.did,
          verifiableCredentials: [credential],
        },
        {
          headers: {
            Authorization: `Bearer ${this.access_token}`,
          },
          params: {
            asJwt: "true",
            audience: audience,
          },
        }
      );
      return response.data;
    } catch (err) {
      throw new DSPClientError("Could not request VP", err);
    }
  }

  async requestValidation(
    jwt: VerifiablePresentationJwt,
    audience: string
  ): Promise<boolean> {
    if (
      !this.access_token ||
      !this.expiration ||
      this.expiration < new Date()
    ) {
      await this.requestAccessToken();
    }
    try {
      const response = await axios.post<ValidationResult>(
        this.iamConfig.validationUrl,
        jwt,
        {
          headers: {
            Authorization: `Bearer ${this.access_token}`,
          },
          params: {
            asJwt: "true",
            audience: audience,
            withCredentialExpiryDate: "true",
          },
        }
      );
      for (const validation of this.iamConfig.validations) {
        const validationResult = response.data[validation];
        if (validationResult) {
          if (validationResult instanceof Array) {
            if (validationResult.some((c) => !c)) {
              this.logger.log(
                `Validation for ${validation} contains at least one false`
              );
              return false;
            }
          } else {
            if (!validationResult) {
              this.logger.log(`Validation for ${validation} is false`);
              return false;
            }
          }
        } else {
          return false;
        }
      }
      return true;
    } catch (err) {
      throw new DSPClientError("Could not request VP", err);
    }
  }
}
