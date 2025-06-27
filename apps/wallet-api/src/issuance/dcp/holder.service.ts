import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  AppError,
  parseNetworkError,
  validateOrRejectSync
} from "@tsg-dsp/common-api";
import { VerifiableCredential } from "@tsg-dsp/common-dsp";
import {
  CredentialMessage,
  CredentialOfferMessage,
  CredentialRequestMessage,
  IssuerMetadata
} from "@tsg-dsp/common-dtos";
import { resolveDid } from "@tsg-dsp/common-signing-and-validation";
import { DCPCredentialRequestInitiation } from "@tsg-dsp/wallet-dtos";
import axios, { AxiosResponse } from "axios";
import { plainToInstance } from "class-transformer";
import { randomUUID } from "crypto";

import { DCPHolderConfig, RootConfig } from "../../config.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { SecureTokenService } from "../../keys/token.service.js";

@Injectable()
export class DCPHolderService {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly signatureService: SignatureService,
    private readonly secureTokenService: SecureTokenService,
    private readonly config: RootConfig
  ) {
    this.initialized = this.init();
  }
  private readonly logger = new Logger(this.constructor.name);

  initialized: Promise<boolean>;
  async init() {
    this.logger.log("Initializing HolderService");
    const existingCredentials = await this.credentialsService.getCredentials();
    const existingTypes = existingCredentials.flatMap((c) => c.credential.type);
    await Promise.all(
      this.config.issuance.dcp.map(async (holderConfig) => {
        if (
          holderConfig.credentialType.every((type) =>
            existingTypes.includes(type)
          )
        ) {
          this.logger.log(
            `Already holding ${holderConfig.credentialType.join(", ")} credential(s), skipping request`
          );
        } else {
          await this.requestCredentialWithRetry(holderConfig);
        }
      })
    );

    return true;
  }

  async requestCredentialWithRetry(
    config: DCPHolderConfig,
    retry = 0,
    backOff = 1000
  ) {
    try {
      await this.requestCredential(config);
    } catch (err) {
      if (retry < 5) {
        this.logger.warn(
          `Could not request credential with code ${config.preAuthorizedCode} at ${config.issuerId}, retrying in 10 seconds`
        );
        await new Promise((f) => setTimeout(f, backOff));
        await this.requestCredentialWithRetry(config, ++retry, backOff * 2);
      } else {
        this.logger.error(
          `Could not request credential with code ${config.preAuthorizedCode} at ${config.issuerId}: ${err}`
        );
        throw err;
      }
    }
  }

  private async fetchIssuerMetadata(issuerId: string): Promise<{
    issuerService: string;
    metadata: IssuerMetadata;
  }> {
    const issuerDid = await resolveDid(issuerId);
    const issuerService = issuerDid.service?.find(
      (s) => s.type === "IssuerService" && typeof s.serviceEndpoint === "string"
    );
    if (!issuerService) {
      throw new AppError(
        `No issuer service present in issuer DID document`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    try {
      const metadataRequest = await axios.get<IssuerMetadata>(
        `${issuerService.serviceEndpoint}/metadata`
      );
      return {
        issuerService: `${issuerService.serviceEndpoint}`,
        metadata: metadataRequest.data
      };
    } catch (err) {
      throw parseNetworkError(err, "issuer metadata");
    }
  }

  async requestCredential(
    request: DCPCredentialRequestInitiation
  ): Promise<void> {
    const { issuerService, metadata } = await this.fetchIssuerMetadata(
      request.issuerId
    );

    const credentialsSupported = metadata.credentialsSupported.filter(
      (credential) => request.credentialType.includes(credential.credentialType)
    );

    const unsupportedCredentials = request.credentialType.filter(
      (type) =>
        !credentialsSupported.some(
          (credential) => credential.credentialType === type
        )
    );
    if (unsupportedCredentials.length > 0) {
      throw new AppError(
        `Issuer does not support credential type(s): ${unsupportedCredentials.join(", ")}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const accessToken = await this.secureTokenService.createSelfIssuedIDToken({
      audience: request.issuerId,
      createAccessToken: true,
      preAuthorizedCode: request.preAuthorizedCode
    });

    const holderPid = randomUUID();

    const credentialRequestMessage: CredentialRequestMessage = {
      "@context": ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"],
      type: "CredentialRequestMessage",
      holderPid: holderPid,
      credentials: credentialsSupported.map((credential) => ({
        id: credential.id
      }))
    };

    let credentialRequest: AxiosResponse;
    try {
      credentialRequest = await axios.post(
        `${issuerService}/credentials`,
        credentialRequestMessage,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
    } catch (err) {
      throw parseNetworkError(err, "credential request");
    }
    if (!credentialRequest.headers["location"]) {
      this.logger.debug(credentialRequest);
      throw new AppError(
        "No credential request status location in response",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    } else {
      this.logger.debug(
        `Credential request status location: ${credentialRequest.headers["location"]}`
      );
    }
  }

  async handleCredentialMessage(
    authorizationHeader: string | undefined,
    credentialMessage: CredentialMessage
  ): Promise<void> {
    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new AppError("Invalid authorization", HttpStatus.UNAUTHORIZED);
    }
    const token = authorizationHeader.split(" ")[1];
    const validatedIdToken =
      await this.secureTokenService.validateIDToken(token);

    if (credentialMessage.status === "REJECTED") {
      this.logger.warn(
        `Credential request rejected by ${credentialMessage.issuerPid}: ${credentialMessage.rejectionReason}`
      );
      return;
    }

    if (
      !credentialMessage.credentials ||
      credentialMessage.credentials.length === 0
    ) {
      throw new AppError(
        `No credentials in credential message`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    for (const credential of credentialMessage.credentials) {
      if (credential.format !== "vc11-bssl/ld") {
        this.logger.warn(
          `Credential format ${credential.format} not supported`
        );
        this.logger.debug(credential);
        throw new AppError(
          `Credential format ${credential.format} not supported`,
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger);
      }
      const credentialObject = validateOrRejectSync(
        plainToInstance(VerifiableCredential, JSON.parse(credential.payload))
      );
      if (credentialObject.issuer !== validatedIdToken.sub) {
        throw new AppError(
          `Credential issuer ${credentialObject.issuer} does not match token subject ${validatedIdToken.sub}`,
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger);
      }
      await this.credentialsService.importCredential(credentialObject);
      this.logger.log(`Imported credential ${credentialObject.id}`);
    }
  }

  async handleCredentialOfferMessage(
    authorization: string | undefined,
    credentialOfferMessage: CredentialOfferMessage
  ): Promise<void> {
    this.logger.debug(
      `Received credential offer message: ${JSON.stringify(credentialOfferMessage, null, 2)} and authorization: ${authorization}`
    );
    throw new AppError("Method not implemented", HttpStatus.NOT_IMPLEMENTED);
  }
}
