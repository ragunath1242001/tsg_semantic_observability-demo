import { Logger } from "@nestjs/common";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
  VerifiablePresentationJwt
} from "@tsg-dsp/common-dsp";
import { plainToInstance } from "class-transformer";
import { decode } from "jsonwebtoken";
import { TsgWalletDirectConfig } from "../../config";
import { DSPClientError } from "../../utils/errors/error";
import { AuthClientService } from "../auth.client.service";
import { Credential, ValidationResult, WalletClient } from "./walletClient";
import { DIDDocument } from "did-resolver";

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
            audience: audience
          }
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
  ): Promise<VerifiablePresentation | undefined> {
    const jwt: VerifiablePresentationJwt = {
      vp: token
    };
    try {
      const response = await this.authClientService
        .axiosInstance()
        .post<ValidationResult>(this.iamConfig.validationUrl, jwt, {
          params: {
            audience: audience
          }
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
