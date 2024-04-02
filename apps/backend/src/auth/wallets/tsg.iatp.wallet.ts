import qs from "qs";
import { TsgWalletIatpConfig } from "../../config";
import { Credential, WalletClient } from "./walletClient";
import axios from "axios";
import { DSPClientError } from "../../utils/errors/error";
import { Logger } from "@nestjs/common";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
} from "@tsg-dsp/common";
import crypto from "crypto";

export class TsgIatpWalletClient extends WalletClient {
  constructor(readonly iamConfig: TsgWalletIatpConfig) {
    super();
  }
  readonly logger = new Logger(this.constructor.name);
  access_token?: string;
  expiration?: Date;

  async ensureAccessToken() {
    if (
      !this.access_token ||
      !this.expiration ||
      this.expiration < new Date()
    ) {
      await this.requestAccessToken();
    }
  }

  async requestAccessToken() {
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

      const accessTokenPayload = JSON.parse(
        atob(this.access_token.split(".")[1])
      );
      if (accessTokenPayload["exp"]) {
        this.expiration = new Date(accessTokenPayload["exp"] * 1000 - 10000);
      }
    } catch (err) {
      throw new DSPClientError(
        "Could not request access token from wallet",
        err
      );
    }
  }

  async requestVerifiablePresentation(audience: string): Promise<string> {
    try {
      await this.ensureAccessToken();
      const response = await axios.get<{ id_token: string }>(
        this.iamConfig.siopUrl,
        {
          headers: {
            Authorization: `Bearer ${this.access_token}`,
          },
          params: {
            audience: audience,
          },
        }
      );
      return response.data.id_token;
    } catch (err) {
      throw new DSPClientError("Could not request VP", err);
    }
  }

  async requestValidation(
    token: string,
    audience: string
  ): Promise<
    VerifiablePresentation<VerifiableCredential<CredentialSubject>> | undefined
  > {
    try {
      await this.ensureAccessToken();
      const response = await axios.post<
        VerifiablePresentation<VerifiableCredential<CredentialSubject>>
      >(
        this.iamConfig.verifyUrl,
        {
          holderIdToken: token,
          presentationDefinition: {
            id: crypto.randomUUID(),
            name: "DSP Presentation definition",
            input_descriptors: [
              {
                id: crypto.randomUUID(),
                name: "Primary credential descriptor",
                constraints: {
                  fields: [
                    ...(this.iamConfig.typeFilter
                      ? [
                          {
                            path: ["$.type"],
                            filter: {
                              type: "string",
                              pattern: this.iamConfig.typeFilter,
                            },
                          },
                        ]
                      : []),
                    ...(this.iamConfig.issuerFilter
                      ? [
                          {
                            path: ["$.issuer"],
                            filter: {
                              type: "string",
                              pattern: this.iamConfig.issuerFilter,
                            },
                          },
                        ]
                      : []),
                    ...(this.iamConfig.customFields ?? []),
                  ],
                },
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.access_token}`,
          },
          params: {
            audience: audience,
          },
        }
      );
      return response.data;
    } catch (err) {
      throw new DSPClientError("Could not request VP", err);
    }
  }

  async getCredentials() {
    try {
      await this.ensureAccessToken();
      const response = await axios.get<Credential[]>(
        `${this.iamConfig.walletUrl}/management/credentials`,
        {
          headers: {
            Authorization: `Bearer ${this.access_token}`,
          },
        }
      );
      return response.data;
    } catch (err) {
      throw new DSPClientError("Could not get credentials", err);
    }
  }
}
