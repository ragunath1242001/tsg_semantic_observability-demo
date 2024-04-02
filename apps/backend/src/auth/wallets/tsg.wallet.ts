import qs from "qs";
import { TsgWalletDirectConfig } from "../../config";
import { Credential, ValidationResult, WalletClient } from "./walletClient";
import axios from "axios";
import { DSPClientError } from "../../utils/errors/error";
import { Logger } from "@nestjs/common";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
  VerifiablePresentationJwt,
} from "@tsg-dsp/common";
import { plainToInstance } from "class-transformer";
import { decode } from "jsonwebtoken";

export class TsgWalletClient extends WalletClient {
  constructor(readonly iamConfig: TsgWalletDirectConfig) {
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
      ).andLog(this.logger, "warn");
    }
  }

  async requestVerifiablePresentation(audience: string): Promise<string> {
    try {
      await this.ensureAccessToken();
      const response = await axios.get<VerifiablePresentationJwt>(
        this.iamConfig.presentationUrl,
        {
          headers: {
            Authorization: `Bearer ${this.access_token}`,
          },
          params: {
            credentialId: this.iamConfig.credentialId,
            asJwt: "true",
            audience: audience,
          },
        }
      );
      this.logger.debug(`Successfully requested Verifiable Presentation`);
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
    try {
      await this.ensureAccessToken();
      const response = await axios.post<ValidationResult>(
        this.iamConfig.validationUrl,
        jwt,
        {
          headers: {
            Authorization: `Bearer ${this.access_token}`,
          },
          params: {
            audience: audience,
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
      this.logger.debug(`Successfully validated Verifiable Presentation`);
      return plainToInstance(VerifiablePresentation, tokenPayload!["vp"]);
    } catch (err) {
      throw new DSPClientError("Could not request VP", err).andLog(
        this.logger,
        "warn"
      );
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
      this.logger.debug(`Successfully requested credentials at local wallet`);
      return response.data;
    } catch (err) {
      throw new DSPClientError("Could not get credentials", err).andLog(
        this.logger,
        "warn"
      );
    }
  }
}
