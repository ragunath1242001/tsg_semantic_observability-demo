import { Logger } from "@nestjs/common";
import { VerifiablePresentation } from "@tsg-dsp/common-dsp";
import crypto from "crypto";
import { TsgWalletConfig } from "../../config.js";
import { DSPClientError } from "../../utils/errors/error.js";
import { Credential, WalletClient } from "./walletClient.js";
import { DIDDocument } from "did-resolver";
import { InputDescriptor } from "@tsg-dsp/common-dtos";
import { AuthClientService } from "@tsg-dsp/common-api";

export class TsgWalletClient extends WalletClient {
  constructor(
    private readonly iamConfig: TsgWalletConfig,
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
            audience: audience
          }
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
  ): Promise<VerifiablePresentation[] | undefined> {
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
                          pattern: this.iamConfig.typeFilter
                        }
                      }
                    ]
                  : []),
                ...(this.iamConfig.issuerFilter
                  ? [
                      {
                        path: ["$.issuer"],
                        filter: {
                          type: "string",
                          pattern: this.iamConfig.issuerFilter
                        }
                      }
                    ]
                  : []),
                ...(this.iamConfig.customFields ?? [])
              ]
            }
          }
        ];
      }

      const response = await this.authClientService
        .axiosInstance()
        .post<VerifiablePresentation[]>(
          this.iamConfig.verifyUrl,
          {
            holderIdToken: token,
            presentationDefinition: {
              id: crypto.randomUUID(),
              name: "DSP Presentation definition",
              input_descriptors: inputDescriptors
            }
          },
          {
            params: {
              audience: audience
            }
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

  async getCredentials(): Promise<Credential[]> {
    try {
      const response = await this.authClientService
        .axiosInstance()
        .get<
          Credential[]
        >(`${this.iamConfig.walletUrl}/management/credentials/dataspace`);
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
          plainDocument: document
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
          proofDocument: signedDocument
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
