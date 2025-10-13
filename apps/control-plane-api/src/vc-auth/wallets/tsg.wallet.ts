import { Logger } from "@nestjs/common";
import { AuthClientService } from "@tsg-dsp/common-api";
import {
  CredentialContainer,
  formatPresentation,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import { InputDescriptor, PresentationDefinition } from "@tsg-dsp/common-dtos";
import crypto from "crypto";

import { TsgWalletConfig } from "../../config.js";
import { DSPClientError } from "../../utils/errors/error.js";
import { Credential, WalletClient } from "./walletClient.js";

export class TsgWalletClient extends WalletClient {
  constructor(
    private readonly iamConfig: TsgWalletConfig,
    private readonly authClientService: AuthClientService
  ) {
    super();
  }
  readonly logger = new Logger(this.constructor.name);

  private etagCache = new Map<string, { etag: string; data: any }>();

  private async cachedGet<T>(url: string, cacheKey: string): Promise<T> {
    const cached = this.etagCache.get(cacheKey);
    const headers: Record<string, string> = {};
    if (cached?.etag) {
      headers["If-None-Match"] = cached.etag;
    }
    try {
      const response = await this.authClientService
        .axiosInstance()
        .get<T>(url, { headers });
      const etag = response.headers["etag"] as string;
      if (etag) {
        this.etagCache.set(cacheKey, { etag, data: response.data });
      }
      return response.data;
    } catch (err: any) {
      if (err.response && err.response.status === 304 && cached) {
        this.logger.debug(
          `${cacheKey} not modified; returning cached version.`
        );
        return cached.data as T;
      }
      throw new DSPClientError(`Cached GET failed for ${cacheKey}`, err).andLog(
        this.logger,
        "warn"
      );
    }
  }

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
    inputDescriptors?: InputDescriptor[],
    scope?: string[]
  ): Promise<CredentialContainer[] | undefined> {
    try {
      if (!inputDescriptors && !scope) {
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
      let presentationDefinition: PresentationDefinition | undefined =
        undefined;
      if (inputDescriptors) {
        presentationDefinition = {
          id: crypto.randomUUID(),
          name: "DSP Presentation definition",
          input_descriptors: inputDescriptors
        };
      }

      const response = await this.authClientService
        .axiosInstance()
        .post<VerifiablePresentation[]>(
          this.iamConfig.verifyUrl,
          {
            holderIdToken: token,
            presentationDefinition: presentationDefinition,
            scope: scope
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
      const credentialContainers = response.data.flatMap(formatPresentation);
      return credentialContainers;
    } catch (err) {
      throw new DSPClientError("Could not request VP", err).andLog(
        this.logger,
        "warn"
      );
    }
  }

  async getCredentials(): Promise<Credential[]> {
    const url = `${this.iamConfig.walletUrl}/management/credentials/dataspace`;
    return await this.cachedGet<Credential[]>(url, "credentials");
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
}
