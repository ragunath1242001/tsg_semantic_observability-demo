import qs from "qs";
import { IamConfig } from "../../config";
import { ValidationResult, VerifiablePresentationJwt, WalletClient } from "./walletClient";
import axios from "axios";
import { DSPClientError, DSPError } from "../../utils/errors/error";
import { Logger } from "@nestjs/common";

export class TsgWalletClient extends WalletClient {
  constructor(private readonly iamConfig: IamConfig) {
    super();
  }
  private readonly logger = new Logger(this.constructor.name);
  private access_token?: string;
  private expiration?: Date

  private async requestAccessToken() {
    const data = qs.stringify({
      'client_id': this.iamConfig.clientId,
      'client_secret': this.iamConfig.clientSecret,
      'grant_type': 'client_credentials'
    });
    try {
      const response = await axios.post<{access_token: string}>(this.iamConfig.tokenUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      this.access_token = response.data.access_token;

      const accessTokenPayload = JSON.parse(atob(this.access_token.split('.')[1]))
      if (accessTokenPayload['exp']) {
        this.expiration = new Date(accessTokenPayload['exp'] * 1000 - 10000);
      }
    } catch (err) {
      throw new DSPClientError("Could not request access token from wallet", err);
    }
  }
  
  async requestVerifiablePresentation(audience: string): Promise<VerifiablePresentationJwt> {
    try {
      if (!this.access_token || !this.expiration || this.expiration < new Date()) {
        await this.requestAccessToken();
      }
      const response = await axios.get<VerifiablePresentationJwt>(this.iamConfig.presentationUrl, {
        headers: {
          Authorization: `Bearer ${this.access_token}`
        },
        params: {
          credentialId: this.iamConfig.credentialId,
          asJwt: 'true',
          audience: audience
        }
      });
      return response.data;
    } catch (err) {
      throw new DSPClientError("Could not request VP", err);
    }
  }
  
  async requestValidation(jwt: VerifiablePresentationJwt, audience: string): Promise<boolean> {
    try {
      if (!this.access_token || !this.expiration || this.expiration < new Date()) {
        await this.requestAccessToken();
      }
      const response = await axios.post<ValidationResult>(this.iamConfig.validationUrl, jwt, {
        headers: {
          Authorization: `Bearer ${this.access_token}`
        },
        params: {
          audience: audience
        }
      });
      for (const validation of this.iamConfig.validations) {
        const validationResult = response.data[validation];
        if (validationResult) {
          if (validationResult instanceof Array) {
            if (validationResult.some(c => !c)) {
              this.logger.log(`Validation for ${validation} contains at least one false`);
              return false;
            }
          } else {
            if (!validationResult) {
              this.logger.log(`Validation for ${validation} is false`);
              return false;
            }
          }
        }
      }
      return true;
    } catch (err) {
      throw new DSPClientError("Could not request VP", err);
    }
  }
}