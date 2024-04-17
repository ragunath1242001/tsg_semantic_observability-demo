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
import { AuthClientService } from "../auth.client.service";

export class TsgWalletClient extends WalletClient {
  constructor(
    private readonly iamConfig: TsgWalletDirectConfig,
    private readonly authClientService: AuthClientService
  ) {
    super();
  }
  readonly logger = new Logger(this.constructor.name);

  async requestVerifiablePresentation(audience: string): Promise<string> {
    try {
      const response = await this.authClientService
        .axiosInstance()
        .get<VerifiablePresentationJwt>(this.iamConfig.presentationUrl, {
          params: {
            credentialId: this.iamConfig.credentialId,
            asJwt: "true",
            audience: audience,
          },
        });
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
      const response = await this.authClientService
        .axiosInstance()
        .post<ValidationResult>(this.iamConfig.validationUrl, jwt, {
          params: {
            audience: audience,
          },
        });
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
      const response = await this.authClientService
        .axiosInstance()
        .get<Credential[]>(
          `${this.iamConfig.walletUrl}/management/credentials`
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
