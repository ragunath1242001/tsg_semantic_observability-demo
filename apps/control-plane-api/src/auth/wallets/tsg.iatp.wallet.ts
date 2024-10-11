import { Logger } from "@nestjs/common";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
} from "@tsg-dsp/common-dsp";
import crypto from "crypto";
import { TsgWalletIatpConfig } from "../../config";
import { DSPClientError } from "../../utils/errors/error";
import { AuthClientService } from "../auth.client.service";
import { Credential, WalletClient } from "./walletClient";
import { DIDDocument } from "did-resolver";
import { InputDescriptor } from "@tsg-dsp/common-dtos";

export class TsgIatpWalletClient extends WalletClient {
  constructor(
    private readonly iamConfig: TsgWalletIatpConfig,
    private readonly authClientService: AuthClientService
  ) {
    super();
  }
  readonly logger = new Logger(this.constructor.name);

  async requestVerifiablePresentation(audience: string): Promise<string> {
    try {
      const response = await this.authClientService
        .axiosInstance()
        .get<{ id_token: string }>(this.iamConfig.siopUrl, {
          params: {
            audience: audience,
          },
        });
      return response.data.id_token;
    } catch (err) {
      throw new DSPClientError("Could not request VP", err).andLog(
        this.logger,
        "warn"
      );
    }
  }

  async requestValidation(
    token: string,
    audience: string,
    inputDescriptors?: InputDescriptor[]
  ): Promise<
    VerifiablePresentation<VerifiableCredential<CredentialSubject>> | undefined
  > {
    try {
      if (!inputDescriptors) {
        inputDescriptors = [
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
        ];
      }

      const response = await this.authClientService
        .axiosInstance()
        .post<VerifiablePresentation<VerifiableCredential<CredentialSubject>>>(
          this.iamConfig.verifyUrl,
          {
            holderIdToken: token,
            presentationDefinition: {
              id: crypto.randomUUID(),
              name: "DSP Presentation definition",
              input_descriptors: inputDescriptors,
            },
          },
          {
            params: {
              audience: audience,
            },
          }
        );
      this.logger.debug(
        `Successfully requested validation for audience ${audience}`
      );
      return response.data;
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
          `${this.iamConfig.walletUrl}/management/credentials/dataspace`
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

  async requestSignature(document: Record<string, any>): Promise<any> {
    try {
      const response = await this.authClientService
        .axiosInstance()
        .post(`${this.iamConfig.walletUrl}/management/signature/sign`, {
          type: "JsonWebSignature",
          plainDocument: document,
        });
      return response.data;
    } catch (err) {
      throw new DSPClientError("Could not sign document", err).andLog(
        this.logger,
        "warn"
      );
    }
  }

  async requestSignatureValidation(
    signedDocument: Record<string, any>
  ): Promise<any> {
    try {
      const response = await this.authClientService
        .axiosInstance()
        .post(`${this.iamConfig.walletUrl}/management/signature/validate`, {
          type: "JsonWebSignature",
          jsonWebSignature: signedDocument,
        });
      return response.data;
    } catch (err) {
      throw new DSPClientError("Could not validate document", err).andLog(
        this.logger,
        "warn"
      );
    }
  }

  async resolveDidDocument(didId: string): Promise<DIDDocument> {
    try {
      const response = await this.authClientService
        .axiosInstance()
        .get<DIDDocument>(
          `${this.iamConfig.walletUrl}/management/did/resolve/${encodeURI(
            didId
          )}`
        );
      this.logger.debug(
        `Successfully resolved DID Document for ${didId} at local wallet`
      );
      return response.data;
    } catch (err) {
      throw new DSPClientError(
        `Could not resolve DID Document for ${didId}`,
        err
      ).andLog(this.logger, "warn");
    }
  }
}
