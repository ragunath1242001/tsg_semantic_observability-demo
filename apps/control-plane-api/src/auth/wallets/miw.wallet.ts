import { Logger } from "@nestjs/common";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
  VerifiablePresentationJwt,
} from "@libs/common-dsp";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import { DIDDocument } from "did-resolver";
import jwt, { decode } from "jsonwebtoken";
import qs from "qs";
import { MiwConfig } from "../../config";
import { DSPClientError } from "../../utils/errors/error";
import { Credential, ValidationResult, WalletClient } from "./walletClient";

export interface MiWWalletDetails {
  name: string;
  did: string;
  bpn: string;
  algorithm: string;
  didDocument: DIDDocument;
  verifiableCredentials: VerifiableCredential<CredentialSubject>[];
}

export class ManagedIdentityWalletClient extends WalletClient {
  constructor(private readonly iamConfig: MiwConfig) {
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
      ).andLog(this.logger, "warn");
    }
  }

  private async getWallet(): Promise<MiWWalletDetails> {
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
      throw new DSPClientError("Could not request wallet details", err).andLog(
        this.logger,
        "warn"
      );
    }
  }

  async requestVerifiablePresentation(audience: string): Promise<string> {
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
      return response.data.vp;
    } catch (err) {
      throw new DSPClientError("Could not request VP", err).andLog(
        this.logger,
        "warn"
      );
    }
  }

  async requestValidation(
    token: string,
    audience: string
  ): Promise<
    VerifiablePresentation<VerifiableCredential<CredentialSubject>> | undefined
  > {
    const jwt: VerifiablePresentationJwt = {
      vp: token,
    };
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
              return undefined;
            }
          } else {
            if (!validationResult) {
              this.logger.log(`Validation for ${validation} is false`);
              return undefined;
            }
          }
        } else {
          this.logger.log(`Validation for ${validation} is false`);
          return undefined;
        }
      }
      const tokenPayload = decode(token, { json: true });
      return plainToInstance(VerifiablePresentation, tokenPayload!["vp"]);
    } catch (err) {
      throw new DSPClientError("Could not request VP", err).andLog(
        this.logger,
        "warn"
      );
    }
  }

  async getCredentials(): Promise<Credential[]> {
    return [];
  }
}
